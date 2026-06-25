import { db } from '../config/database';
import { IKnowledgeUploadBatch } from '../interfaces/admin-upload.interface';
import { AppError } from '../utils/AppError';

export class UploadBatchRepository {
  async createBatch(
    payload: Pick<IKnowledgeUploadBatch, 'uploaded_by' | 'file_name' | 'file_type' | 'status'>
  ): Promise<IKnowledgeUploadBatch> {
    try {
      const result = await db.query<IKnowledgeUploadBatch>(
        `
          insert into knowledge_upload_batches (uploaded_by, file_name, file_type, status)
          values ($1, $2, $3, $4)
          returning *
        `,
        [payload.uploaded_by, payload.file_name, payload.file_type, payload.status]
      );

      return result.rows[0];
    } catch (error) {
      throw new AppError('Failed to create upload batch.', 500, error);
    }
  }

  async updateBatch(
    batchId: string,
    payload: Partial<
      Pick<
        IKnowledgeUploadBatch,
        | 'total_rows'
        | 'success_count'
        | 'failed_count'
        | 'skipped_count'
        | 'status'
        | 'error_message'
        | 'completed_at'
      >
    >
  ): Promise<IKnowledgeUploadBatch> {
    try {
      const result = await db.query<IKnowledgeUploadBatch>(
        `
          update knowledge_upload_batches
          set
            total_rows = coalesce($2, total_rows),
            success_count = coalesce($3, success_count),
            failed_count = coalesce($4, failed_count),
            skipped_count = coalesce($5, skipped_count),
            status = coalesce($6, status),
            error_message = coalesce($7, error_message),
            completed_at = coalesce($8, completed_at)
          where id = $1
          returning *
        `,
        [
          batchId,
          payload.total_rows ?? null,
          payload.success_count ?? null,
          payload.failed_count ?? null,
          payload.skipped_count ?? null,
          payload.status ?? null,
          payload.error_message ?? null,
          payload.completed_at ?? null
        ]
      );

      const batch = result.rows[0];

      if (!batch) {
        throw new AppError('Upload batch not found.', 404);
      }

      return batch;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError('Failed to update upload batch.', 500, error);
    }
  }
}
