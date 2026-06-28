import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { adminMiddleware } from '../middlewares/admin.middleware';
import { authMiddleware } from '../middlewares/auth.middleware';
import { upload } from '../middlewares/upload.middleware';
import { asyncHandler } from '../utils/asyncHandler';

export const createAdminRoutes = (adminController: AdminController): Router => {
  const router = Router();

  router.get(
    '/users',
    authMiddleware,
    adminMiddleware,
    asyncHandler(adminController.listUsers)
  );
  router.patch(
    '/users/:userId/role',
    authMiddleware,
    adminMiddleware,
    asyncHandler(adminController.updateUserRole)
  );
  router.post(
    '/knowledge/upload',
    authMiddleware,
    adminMiddleware,
    upload.single('file'),
    asyncHandler(adminController.uploadKnowledgeFile)
  );
  router.get(
    '/knowledge/upload/:batchId/progress',
    authMiddleware,
    adminMiddleware,
    asyncHandler(adminController.getUploadProgress)
  );

  return router;
};
