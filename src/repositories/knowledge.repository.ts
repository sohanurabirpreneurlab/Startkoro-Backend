import { db } from '../config/database';
import { IKnowledgeDocument } from '../interfaces/knowledge-document.interface';
import { AppError } from '../utils/AppError';

export class KnowledgeRepository {
  async createKnowledgeDocument(
    payload: Pick<
      IKnowledgeDocument,
      | 'title'
      | 'source_type'
      | 'original_question'
      | 'original_answer'
      | 'normalized_question'
      | 'status'
      | 'uploaded_by'
      | 'batch_id'
    >
  ): Promise<IKnowledgeDocument> {
    try {
      const result = await db.query<IKnowledgeDocument>(
        `
          insert into knowledge_documents
          (title, source_type, original_question, original_answer, normalized_question, status, uploaded_by, batch_id)
          values ($1, $2, $3, $4, $5, $6, $7, $8)
          returning *
        `,
        [
          payload.title,
          payload.source_type,
          payload.original_question,
          payload.original_answer,
          payload.normalized_question,
          payload.status,
          payload.uploaded_by,
          payload.batch_id
        ]
      );

      return result.rows[0];
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new AppError('A knowledge document with the same normalized question already exists.', 409);
      }

      throw new AppError('Failed to create knowledge document.', 500, error);
    }
  }

  async findByNormalizedQuestion(normalizedQuestion: string): Promise<IKnowledgeDocument | null> {
    try {
      const result = await db.query<IKnowledgeDocument>(
        'select * from knowledge_documents where normalized_question = $1 limit 1',
        [normalizedQuestion]
      );
      return result.rows[0] ?? null;
    } catch (error) {
      throw new AppError('Failed to fetch knowledge document by normalized question.', 500, error);
    }
  }

  async listKnowledgeDocuments(): Promise<IKnowledgeDocument[]> {
    try {
      const result = await db.query<IKnowledgeDocument>(
        'select * from knowledge_documents order by created_at desc'
      );
      return result.rows;
    } catch (error) {
      throw new AppError('Failed to list knowledge documents.', 500, error);
    }
  }

  async findById(id: number): Promise<IKnowledgeDocument | null> {
    try {
      const result = await db.query<IKnowledgeDocument>(
        'select * from knowledge_documents where id = $1 limit 1',
        [id]
      );
      return result.rows[0] ?? null;
    } catch (error) {
      throw new AppError('Failed to fetch knowledge document.', 500, error);
    }
  }

  async deleteKnowledgeDocument(id: number): Promise<void> {
    try {
      await db.query('delete from knowledge_documents where id = $1', [id]);
    } catch (error) {
      throw new AppError('Failed to delete knowledge document.', 500, error);
    }
  }
}
