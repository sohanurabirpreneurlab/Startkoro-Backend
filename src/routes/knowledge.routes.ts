import { Router } from 'express';
import { KnowledgeController } from '../controllers/knowledge.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { asyncHandler } from '../utils/asyncHandler';

export const createKnowledgeRoutes = (knowledgeController: KnowledgeController): Router => {
  const router = Router();

  router.use(authMiddleware);

  router.post('/manual-qa', asyncHandler(knowledgeController.createManualQA));
  router.get('/documents', asyncHandler(knowledgeController.listDocuments));
  router.delete('/documents/:documentId', asyncHandler(knowledgeController.deleteDocument));

  return router;
};
