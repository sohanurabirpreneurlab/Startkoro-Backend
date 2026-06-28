import { Express } from 'express';
import {
  KnowledgeUploadStartResult,
  ParsedKnowledgeRow,
  UploadProgressResult
} from '../interfaces/admin-upload.interface';
import { DocumentChunkRepository } from '../repositories/document-chunk.repository';
import { KnowledgeRepository } from '../repositories/knowledge.repository';
import { UploadBatchRepository } from '../repositories/upload-batch.repository';
import { UserRepository } from '../repositories/user.repository';
import { AppError } from '../utils/AppError';
import { buildKnowledgeChunkText, normalizeKnowledgeQuestion } from '../utils/knowledge';
import { EmbeddingService } from './embedding.service';
import { ExcelParserService } from './excel-parser.service';
import { ISafeUser, IUser } from '../interfaces/user.interface';
import { IKnowledgeDocument } from '../interfaces/knowledge-document.interface';

const MAX_UPLOAD_ROWS = 500;

export class AdminService {
  constructor(
    private readonly uploadBatchRepository: UploadBatchRepository,
    private readonly knowledgeRepository: KnowledgeRepository,
    private readonly documentChunkRepository: DocumentChunkRepository,
    private readonly userRepository: UserRepository,
    private readonly excelParserService: ExcelParserService,
    private readonly embeddingService: EmbeddingService
  ) {}

  async listUsers(search?: string): Promise<ISafeUser[]> {
    const users = await this.userRepository.list(search);
    return users.map((user) => this.toSafeUser(user));
  }

  async updateUserRole(adminUserId: string, userId: string, role: 'user' | 'admin'): Promise<ISafeUser> {
    if (adminUserId === userId && role !== 'admin') {
      throw new AppError('You cannot remove your own admin access.', 400);
    }

    const updatedUser = await this.userRepository.updateRole(userId, role);
    return this.toSafeUser(updatedUser);
  }

  async uploadKnowledgeFile(
    adminUserId: string,
    file: Express.Multer.File
  ): Promise<KnowledgeUploadStartResult> {
    // The upload HTTP request should finish quickly. Embeddings can take much longer,
    // so we parse and validate synchronously, then return a batch id for polling.
    const rows = this.excelParserService.parseKnowledgeFile(file.buffer, file.originalname);

    if (rows.length === 0) {
      throw new AppError('The uploaded file does not contain any knowledge rows.', 400);
    }

    if (rows.length > MAX_UPLOAD_ROWS) {
      throw new AppError(`Upload row limit exceeded. Maximum allowed rows is ${MAX_UPLOAD_ROWS}.`, 400);
    }

    // Progress lives in knowledge_upload_batches so polling stays resilient across retries,
    // reloads, and long-running background work.
    const batch = await this.uploadBatchRepository.createBatch({
      uploaded_by: adminUserId,
      file_name: file.originalname,
      file_type: file.mimetype || null,
      total_rows: rows.length,
      processed_rows: 0,
      success_count: 0,
      failed_count: 0,
      skipped_count: 0,
      progress_percentage: 0,
      status: 'processing'
    });

    // setImmediate is the lightest MVP background handoff here. It lets the API respond
    // with the batch id before expensive row processing and embedding generation begin.
    setImmediate(() => {
      this.processKnowledgeRowsInBackground(batch.id, adminUserId, rows).catch(async (error) => {
        const message = error instanceof Error ? error.message : 'Knowledge upload processing failed.';

        console.error('Knowledge upload batch failed:', {
          batchId: batch.id,
          adminUserId,
          error
        });

        await this.uploadBatchRepository.markFailed(batch.id, message);
      });
    });

    return {
      batchId: batch.id
    };
  }

  async processKnowledgeRowsInBackground(
    batchId: string,
    adminUserId: string,
    rows: ParsedKnowledgeRow[]
  ): Promise<void> {
    const totalRows = rows.length;
    let processedRows = 0;
    let successCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    for (const row of rows) {
      try {
        const outcome = await this.processKnowledgeRow(batchId, adminUserId, row);

        if (outcome === 'success') {
          successCount += 1;
        } else {
          skippedCount += 1;
        }
      } catch (_error) {
        // One bad row should not fail the entire batch. We keep moving and reflect the failure in counts.
        failedCount += 1;
      }

      processedRows += 1;

      const progressPercentage = Math.round((processedRows / totalRows) * 100);

      await this.uploadBatchRepository.updateBatch(batchId, {
        processed_rows: processedRows,
        success_count: successCount,
        failed_count: failedCount,
        skipped_count: skippedCount,
        progress_percentage: progressPercentage,
        status: processedRows === totalRows ? 'completed' : 'processing'
      });
    }

    await this.uploadBatchRepository.markCompleted(batchId, {
      total_rows: totalRows,
      processed_rows: processedRows,
      success_count: successCount,
      failed_count: failedCount,
      skipped_count: skippedCount,
      progress_percentage: 100,
      completed_at: new Date().toISOString()
    });
  }

  async getUploadProgress(adminUserId: string, batchId: string): Promise<UploadProgressResult> {
    // The current auth model exposes only the admin role. Until a dedicated super-admin role exists,
    // admins may only read batches they created.
    const batch = await this.uploadBatchRepository.findByIdAndUserId(batchId, adminUserId);

    if (!batch) {
      throw new AppError('Upload batch not found.', 404);
    }

    return {
      batchId: batch.id,
      status: batch.status,
      totalRows: batch.total_rows,
      processedRows: batch.processed_rows,
      successCount: batch.success_count,
      failedCount: batch.failed_count,
      skippedCount: batch.skipped_count,
      progressPercentage: batch.progress_percentage,
      errorMessage: batch.error_message
    };
  }

  private async processKnowledgeRow(
    batchId: string,
    adminUserId: string,
    row: ParsedKnowledgeRow
  ): Promise<'success' | 'skipped'> {
    const question = row.question.trim();
    const answer = row.answer.trim();

    if (!question || !answer) {
      return 'skipped';
    }

    const normalizedQuestion = normalizeKnowledgeQuestion(question);
    const existingDocument = await this.knowledgeRepository.findByNormalizedQuestion(normalizedQuestion);

    if (existingDocument) {
      // Duplicate questions are skipped so retrieval stays deterministic across repeated uploads.
      return 'skipped';
    }

    const title = row.title?.trim() || question.slice(0, 120);
    let document: IKnowledgeDocument;

    try {
      document = await this.knowledgeRepository.createKnowledgeDocument({
        title,
        source_type: 'excel_csv_upload',
        original_question: question,
        original_answer: answer,
        normalized_question: normalizedQuestion,
        status: 'ready',
        uploaded_by: adminUserId,
        batch_id: batchId
      });
    } catch (error) {
      if (error instanceof AppError && error.statusCode === 409) {
        return 'skipped';
      }

      throw error;
    }

    try {
      // We embed question + answer together because retrieval should return the exact answer context
      // that belongs to the stored question, not the question text in isolation.
      const chunkText = buildKnowledgeChunkText(question, answer);
      const embedding = await this.embeddingService.generateEmbedding(chunkText);

      // Each validated spreadsheet row becomes one document and one searchable chunk for the MVP.
      await this.documentChunkRepository.createDocumentChunk({
        document_id: document.id,
        chunk_index: 0,
        chunk_text: chunkText,
        embedding,
        metadata: {
          title,
          category: row.category ?? null,
          tags: row.tags ?? [],
          source_type: 'excel_csv_upload',
          normalized_question: normalizedQuestion
        }
      });
    } catch (error) {
      // If embedding or chunk storage fails, we remove the document so a retry does not look like a duplicate.
      await this.knowledgeRepository.deleteKnowledgeDocument(document.id);
      throw error;
    }

    return 'success';
  }

  private toSafeUser(user: IUser): ISafeUser {
    const { password_hash: _passwordHash, ...safeUser } = user;
    return safeUser;
  }
}
