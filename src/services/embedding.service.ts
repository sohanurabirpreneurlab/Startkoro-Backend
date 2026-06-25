import { env } from '../config/env';
import { openai } from '../config/openai';
import { AppError } from '../utils/AppError';

export class EmbeddingService {
  async generateEmbedding(text: string): Promise<number[]> {
    const input = text.trim();

    if (!input) {
      throw new AppError('Text is required to generate an embedding.', 400);
    }

    const response = await openai.embeddings.create({
      model: env.OPENAI_EMBEDDING_MODEL,
      input
    });

    const embedding = response.data[0]?.embedding;

    if (!embedding) {
      throw new AppError('Embedding generation returned no vector.', 500);
    }

    // The returned array becomes the pgvector query input for semantic search.
    return embedding;
  }
}
