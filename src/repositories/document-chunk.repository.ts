import { db, formatVector } from '../config/database';
import { IDocumentChunk, IRetrievedChunk } from '../interfaces/document-chunk.interface';
import { AppError } from '../utils/AppError';

export class DocumentChunkRepository {
  async createDocumentChunk(
    payload: Pick<IDocumentChunk, 'document_id' | 'chunk_index' | 'chunk_text' | 'embedding' | 'metadata'>
  ): Promise<IDocumentChunk> {
    try {
      const result = await db.query<
        Omit<IDocumentChunk, 'embedding'> & {
          embedding: string | null;
        }
      >(
        `
          insert into document_chunks (document_id, chunk_index, chunk_text, embedding, metadata)
          values ($1, $2, $3, $4::vector, $5::jsonb)
          returning id, document_id, chunk_index, chunk_text, embedding::text as embedding, metadata, created_at
        `,
        [
          payload.document_id,
          payload.chunk_index,
          payload.chunk_text,
          payload.embedding ? formatVector(payload.embedding) : null,
          payload.metadata ? JSON.stringify(payload.metadata) : null
        ]
      );

      return {
        ...result.rows[0],
        embedding: payload.embedding ?? null
      };
    } catch (error) {
      throw new AppError('Failed to create document chunk.', 500, error);
    }
  }

  async matchByEmbedding(queryEmbedding: number[], matchCount = 5): Promise<IRetrievedChunk[]> {
    try {
      // The SQL function encapsulates pgvector similarity search so the repository only passes
      // the query embedding and the top-K count to Postgres.
      const result = await db.query<IRetrievedChunk>(
        'select * from match_document_chunks($1::vector, $2)',
        [formatVector(queryEmbedding), matchCount]
      );
      return result.rows;
    } catch (error) {
      throw new AppError('Failed to search vector knowledge.', 500, error);
    }
  }
}
