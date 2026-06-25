import { IRetrievedChunk } from '../interfaces/document-chunk.interface';
import { DocumentChunkRepository } from '../repositories/document-chunk.repository';

export class VectorService {
  constructor(private readonly documentChunkRepository: DocumentChunkRepository) {}

  async searchSimilarChunks(queryEmbedding: number[], matchCount = 5): Promise<IRetrievedChunk[]> {
    // We default to the top 5 matches to keep retrieval relevant without inflating prompt size.
    // Callers can override matchCount if a feature needs broader or narrower context.
    return this.documentChunkRepository.matchByEmbedding(queryEmbedding, matchCount);
  }
}
