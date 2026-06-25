import { Response } from 'express';
import { z } from 'zod';
import { IAuthenticatedRequest } from '../interfaces/user.interface';
import { AppError } from '../utils/AppError';
import { KnowledgeService } from '../services/knowledge.service';

const createManualQASchema = z.object({
  title: z.string().min(1).max(200),
  question: z.string().min(1).max(5000),
  answer: z.string().min(1).max(10000)
});

const deleteDocumentParamsSchema = z.object({
  documentId: z.coerce.number().int().positive()
});

export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  private requireAdmin(req: IAuthenticatedRequest): string {
    const userId = req.user?.sub;

    if (!userId) {
      throw new AppError('User authentication is required.', 401);
    }

    if (req.user?.role !== 'admin') {
      throw new AppError('Admin access is required.', 403);
    }

    return userId;
  }

  createManualQA = async (req: IAuthenticatedRequest, res: Response): Promise<void> => {
    const userId = this.requireAdmin(req);

    const payload = createManualQASchema.parse(req.body);
    const result = await this.knowledgeService.createManualQAKnowledge({
      title: payload.title,
      question: payload.question,
      answer: payload.answer,
      uploadedBy: userId
    });

    res.status(201).json({
      success: true,
      message: 'Knowledge document created successfully.',
      data: result.document
    });
  };

  listDocuments = async (req: IAuthenticatedRequest, res: Response): Promise<void> => {
    this.requireAdmin(req);
    const documents = await this.knowledgeService.listKnowledgeDocuments();

    res.status(200).json({
      success: true,
      data: documents
    });
  };

  deleteDocument = async (req: IAuthenticatedRequest, res: Response): Promise<void> => {
    this.requireAdmin(req);

    const { documentId } = deleteDocumentParamsSchema.parse(req.params);
    await this.knowledgeService.deleteKnowledgeDocument(documentId);

    res.status(200).json({
      success: true,
      message: 'Knowledge document deleted successfully.'
    });
  };
}
