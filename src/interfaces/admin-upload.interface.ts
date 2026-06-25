export interface ParsedKnowledgeRow {
  rowNumber: number;
  title?: string;
  question: string;
  answer: string;
  category?: string;
  tags?: string[];
}

export interface UploadSkippedRow {
  rowNumber: number;
  question?: string;
  reason: string;
}

export interface UploadFailedRow {
  rowNumber: number;
  question?: string;
  reason: string;
}

export interface KnowledgeUploadResult {
  batchId: string;
  totalRows: number;
  successCount: number;
  skippedCount: number;
  failedCount: number;
  skippedRows: UploadSkippedRow[];
  failedRows: UploadFailedRow[];
}

export interface IKnowledgeUploadBatch {
  id: string;
  uploaded_by: string | null;
  file_name: string | null;
  file_type: string | null;
  total_rows: number;
  success_count: number;
  failed_count: number;
  skipped_count: number;
  status: string;
  error_message: string | null;
  created_at?: string;
  completed_at?: string | null;
}
