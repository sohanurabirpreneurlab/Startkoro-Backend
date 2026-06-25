import { Express } from 'express';
import {
  KnowledgeUploadResult,
  ParsedKnowledgeRow,
  UploadFailedRow,
  UploadSkippedRow
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
  ): Promise<KnowledgeUploadResult> {
    // Batch tracking gives admins a durable summary even when large uploads contain mixed outcomes.
    const batch = await this.uploadBatchRepository.createBatch({
      uploaded_by: adminUserId,
      file_name: file.originalname,
      file_type: file.mimetype || null,
      status: 'processing'
    });

    try {
      // We parse directly from the in-memory buffer so the server can discard the source file
      // immediately after processing instead of persisting upload artifacts for the MVP.
      const rows = this.excelParserService.parseKnowledgeFile(file.buffer, file.originalname);

      if (rows.length > MAX_UPLOAD_ROWS) {
        throw new AppError(`Upload row limit exceeded. Maximum allowed rows is ${MAX_UPLOAD_ROWS}.`, 400);
      }

      const skippedRows: UploadSkippedRow[] = [];
      const failedRows: UploadFailedRow[] = [];
      let successCount = 0;

      for (const row of rows) {
        try {
          const didCreateKnowledge = await this.processKnowledgeRow(batch.id, adminUserId, row, skippedRows);

          if (didCreateKnowledge) {
            successCount += 1;
          }
        } catch (error) {
          // Row-by-row processing keeps a single bad row from wasting the entire upload batch.
          failedRows.push({
            rowNumber: row.rowNumber,
            question: row.question || undefined,
            reason: error instanceof Error ? error.message : 'Unexpected processing error.'
          });
        }
      }

      await this.uploadBatchRepository.updateBatch(batch.id, {
        total_rows: rows.length,
        success_count: successCount,
        skipped_count: skippedRows.length,
        failed_count: failedRows.length,
        status: 'completed',
        completed_at: new Date().toISOString()
      });

      return {
        batchId: batch.id,
        totalRows: rows.length,
        successCount,
        skippedCount: skippedRows.length,
        failedCount: failedRows.length,
        skippedRows,
        failedRows
      };
    } catch (error) {
      await this.uploadBatchRepository.updateBatch(batch.id, {
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Upload failed.',
        completed_at: new Date().toISOString()
      });

      throw error;
    }
  }

  private async processKnowledgeRow(
    batchId: string,
    adminUserId: string,
    row: ParsedKnowledgeRow,
    skippedRows: UploadSkippedRow[]
  ): Promise<boolean> {
    const question = row.question.trim();
    const answer = row.answer.trim();

    if (!question || !answer) {
      skippedRows.push({
        rowNumber: row.rowNumber,
        question: question || undefined,
        reason: 'Question or answer is empty.'
      });
      return false;
    }

    const normalizedQuestion = normalizeKnowledgeQuestion(question);
    const existingDocument = await this.knowledgeRepository.findByNormalizedQuestion(normalizedQuestion);

    if (existingDocument) {
      // Duplicate questions are skipped so retrieval stays deterministic and the admin gets a clear report.
      skippedRows.push({
        rowNumber: row.rowNumber,
        question,
        reason: 'Duplicate question'
      });
      return false;
    }

    const title = row.title?.trim() || question.slice(0, 120);
    const document = await this.knowledgeRepository.createKnowledgeDocument({
      title,
      source_type: 'excel_csv_upload',
      original_question: question,
      original_answer: answer,
      normalized_question: normalizedQuestion,
      status: 'ready',
      uploaded_by: adminUserId,
      batch_id: batchId
    });

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

    return true;
  }

  private toSafeUser(user: IUser): ISafeUser {
    const { password_hash: _passwordHash, ...safeUser } = user;
    return safeUser;
  }
}
