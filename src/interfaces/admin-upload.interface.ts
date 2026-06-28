export interface ParsedKnowledgeRow {
  rowNumber: number;
  title?: string;
  question: string;
  answer: string;
  category?: string;
  tags?: string[];
}

export type UploadBatchStatus = 'processing' | 'completed' | 'failed';

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
  processed_rows: number;
  success_count: number;
  failed_count: number;
  skipped_count: number;
  progress_percentage: number;
  status: UploadBatchStatus;
  error_message: string | null;
  created_at?: string;
  completed_at?: string | null;
}

export interface CreateUploadBatchData {
  uploaded_by: string | null;
  file_name: string | null;
  file_type: string | null;
  total_rows: number;
  processed_rows: number;
  success_count: number;
  failed_count: number;
  skipped_count: number;
  progress_percentage: number;
  status: UploadBatchStatus;
}

export interface UpdateUploadBatchData {
  total_rows?: number;
  processed_rows?: number;
  success_count?: number;
  failed_count?: number;
  skipped_count?: number;
  progress_percentage?: number;
  status?: UploadBatchStatus;
  error_message?: string | null;
  completed_at?: string | null;
}

export interface KnowledgeUploadStartResult {
  batchId: string;
}

export interface UploadProgressResult {
  batchId: string;
  status: UploadBatchStatus;
  totalRows: number;
  processedRows: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  progressPercentage: number;
  errorMessage?: string | null;
}
