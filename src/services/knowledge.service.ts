import { IDocumentChunk } from '../interfaces/document-chunk.interface';
import { IKnowledgeDocument } from '../interfaces/knowledge-document.interface';
import { DocumentChunkRepository } from '../repositories/document-chunk.repository';
import { KnowledgeRepository } from '../repositories/knowledge.repository';
import { AppError } from '../utils/AppError';
import { buildKnowledgeChunkText, normalizeKnowledgeQuestion } from '../utils/knowledge';
import { EmbeddingService } from './embedding.service';

export class KnowledgeService {
  constructor(
    private readonly knowledgeRepository: KnowledgeRepository,
    private readonly documentChunkRepository: DocumentChunkRepository,
    private readonly embeddingService: EmbeddingService
  ) {}

  async createManualQAKnowledge(payload: {
    title: string;
    question: string;
    answer: string;
    uploadedBy: string;
  }): Promise<{ document: IKnowledgeDocument; chunk: IDocumentChunk }> {
    const normalizedQuestion = normalizeKnowledgeQuestion(payload.question);
    const existingDocument = await this.knowledgeRepository.findByNormalizedQuestion(normalizedQuestion);

    if (existingDocument) {
      throw new AppError('A knowledge document with the same normalized question already exists.', 409);
    }

    const document = await this.knowledgeRepository.createKnowledgeDocument({
      title: payload.title,
      source_type: 'manual_qa',
      original_question: payload.question,
      original_answer: payload.answer,
      normalized_question: normalizedQuestion,
      status: 'ready',
      uploaded_by: payload.uploadedBy,
      batch_id: null
    });

    // We store the final searchable text exactly how the assistant should read it later.
    const chunkText = buildKnowledgeChunkText(payload.question, payload.answer);
    const embedding = await this.embeddingService.generateEmbedding(chunkText);

    const chunk = await this.documentChunkRepository.createDocumentChunk({
      document_id: document.id,
      chunk_index: 0,
      chunk_text: chunkText,
      embedding,
      metadata: {
        title: payload.title,
        source_type: 'manual_qa',
        normalized_question: normalizedQuestion
      }
    });

    return { document, chunk };
  }

  async listKnowledgeDocuments(): Promise<IKnowledgeDocument[]> {
    return this.knowledgeRepository.listKnowledgeDocuments();
  }

  async deleteKnowledgeDocument(documentId: number): Promise<void> {
    await this.knowledgeRepository.deleteKnowledgeDocument(documentId);
  }
}
