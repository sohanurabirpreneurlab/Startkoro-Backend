import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { asyncHandler } from '../utils/asyncHandler';

export const createAuthRoutes = (authController: AuthController): Router => {
  const router = Router();

  router.post('/register', asyncHandler(authController.register));
  router.post('/login', asyncHandler(authController.login));
  router.get('/me', authMiddleware, asyncHandler(authController.me));

  return router;
};
