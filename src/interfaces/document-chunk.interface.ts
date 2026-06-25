export interface IDocumentChunk {
  id: number;
  document_id: number | null;
  chunk_index: number;
  chunk_text: string;
  embedding: number[] | null;
  metadata: Record<string, unknown> | null;
  created_at?: string;
}

export interface IRetrievedChunk {
  id: number;
  document_id: number;
  chunk_text: string;
  metadata: Record<string, unknown> | null;
  similarity: number;
}
