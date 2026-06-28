import { db } from '../config/database';
import {
  CreateUploadBatchData,
  IKnowledgeUploadBatch,
  UpdateUploadBatchData
} from '../interfaces/admin-upload.interface';
import { AppError } from '../utils/AppError';

export class UploadBatchRepository {
  async createBatch(payload: CreateUploadBatchData): Promise<IKnowledgeUploadBatch> {
    try {
      const result = await db.query<IKnowledgeUploadBatch>(
        `
          insert into knowledge_upload_batches (
            uploaded_by,
            file_name,
            file_type,
            total_rows,
            processed_rows,
            success_count,
            failed_count,
            skipped_count,
            progress_percentage,
            status
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          returning *
        `,
        [
          payload.uploaded_by,
          payload.file_name,
          payload.file_type,
          payload.total_rows,
          payload.processed_rows,
          payload.success_count,
          payload.failed_count,
          payload.skipped_count,
          payload.progress_percentage,
          payload.status
        ]
      );

      return result.rows[0];
    } catch (error) {
      throw new AppError('Failed to create upload batch.', 500, error);
    }
  }

  async findById(batchId: string): Promise<IKnowledgeUploadBatch | null> {
    try {
      const result = await db.query<IKnowledgeUploadBatch>(
        'select * from knowledge_upload_batches where id = $1 limit 1',
        [batchId]
      );

      return result.rows[0] ?? null;
    } catch (error) {
      throw new AppError('Failed to fetch upload batch.', 500, error);
    }
  }

  async findByIdAndUserId(batchId: string, userId: string): Promise<IKnowledgeUploadBatch | null> {
    try {
      const result = await db.query<IKnowledgeUploadBatch>(
        `
          select *
          from knowledge_upload_batches
          where id = $1 and uploaded_by = $2
          limit 1
        `,
        [batchId, userId]
      );

      return result.rows[0] ?? null;
    } catch (error) {
      throw new AppError('Failed to fetch upload batch for the current admin.', 500, error);
    }
  }

  async updateBatch(batchId: string, payload: UpdateUploadBatchData): Promise<IKnowledgeUploadBatch> {
    try {
      const result = await db.query<IKnowledgeUploadBatch>(
        `
          update knowledge_upload_batches
          set
            total_rows = coalesce($2, total_rows),
            processed_rows = coalesce($3, processed_rows),
            success_count = coalesce($4, success_count),
            failed_count = coalesce($5, failed_count),
            skipped_count = coalesce($6, skipped_count),
            progress_percentage = coalesce($7, progress_percentage),
            status = coalesce($8, status),
            error_message = coalesce($9, error_message),
            completed_at = coalesce($10, completed_at)
          where id = $1
          returning *
        `,
        [
          batchId,
          payload.total_rows ?? null,
          payload.processed_rows ?? null,
          payload.success_count ?? null,
          payload.failed_count ?? null,
          payload.skipped_count ?? null,
          payload.progress_percentage ?? null,
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

  async markCompleted(
    batchId: string,
    payload: Pick<
      UpdateUploadBatchData,
      | 'total_rows'
      | 'processed_rows'
      | 'success_count'
      | 'failed_count'
      | 'skipped_count'
      | 'progress_percentage'
      | 'completed_at'
    >
  ): Promise<IKnowledgeUploadBatch> {
    return this.updateBatch(batchId, {
      ...payload,
      status: 'completed',
      error_message: null
    });
  }

  async markFailed(batchId: string, errorMessage: string): Promise<IKnowledgeUploadBatch> {
    return this.updateBatch(batchId, {
      status: 'failed',
      error_message: errorMessage,
      completed_at: new Date().toISOString()
    });
  }
}
