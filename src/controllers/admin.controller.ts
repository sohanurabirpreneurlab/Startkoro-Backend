import { Response } from 'express';
import { z } from 'zod';
import { IAuthenticatedRequest } from '../interfaces/user.interface';
import { AdminService } from '../services/admin.service';
import { AppError } from '../utils/AppError';

const listUsersQuerySchema = z.object({
  search: z.string().trim().max(200).optional()
});

const updateUserRoleParamsSchema = z.object({
  userId: z.string().uuid()
});

const uploadProgressParamsSchema = z.object({
  batchId: z.string().uuid()
});

const updateUserRoleBodySchema = z.object({
  role: z.enum(['user', 'admin'])
});

export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  listUsers = async (req: IAuthenticatedRequest, res: Response): Promise<void> => {
    const { search } = listUsersQuerySchema.parse(req.query);
    const users = await this.adminService.listUsers(search);

    res.status(200).json({
      success: true,
      data: users
    });
  };

  updateUserRole = async (req: IAuthenticatedRequest, res: Response): Promise<void> => {
    const adminUserId = req.user?.sub;

    if (!adminUserId) {
      throw new AppError('User authentication is required.', 401);
    }

    const { userId } = updateUserRoleParamsSchema.parse(req.params);
    const { role } = updateUserRoleBodySchema.parse(req.body);
    const updatedUser = await this.adminService.updateUserRole(adminUserId, userId, role);

    res.status(200).json({
      success: true,
      message: 'User role updated successfully.',
      data: updatedUser
    });
  };

  uploadKnowledgeFile = async (req: IAuthenticatedRequest, res: Response): Promise<void> => {
    const adminUserId = req.user?.sub;

    if (!adminUserId) {
      throw new AppError('User authentication is required.', 401);
    }

    if (!req.file) {
      throw new AppError('A knowledge file is required.', 400);
    }

    const result = await this.adminService.uploadKnowledgeFile(adminUserId, req.file);

    res.status(200).json({
      success: true,
      message: 'Knowledge upload started',
      data: result
    });
  };

  getUploadProgress = async (req: IAuthenticatedRequest, res: Response): Promise<void> => {
    const adminUserId = req.user?.sub;

    if (!adminUserId) {
      throw new AppError('User authentication is required.', 401);
    }

    const { batchId } = uploadProgressParamsSchema.parse(req.params);
    const result = await this.adminService.getUploadProgress(adminUserId, batchId);

    res.status(200).json({
      success: true,
      data: result
    });
  };
}
