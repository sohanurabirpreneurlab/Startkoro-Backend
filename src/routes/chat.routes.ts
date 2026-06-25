import { Router } from 'express';
import { ChatController } from '../controllers/chat.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { asyncHandler } from '../utils/asyncHandler';

export const createChatRoutes = (chatController: ChatController): Router => {
  const router = Router();

  router.use(authMiddleware);

  router.post('/', asyncHandler(chatController.createChat));
  router.post('/send-message', asyncHandler(chatController.sendMessage));
  router.get('/', asyncHandler(chatController.listChats));
  router.get('/:chatId', asyncHandler(chatController.getChat));
  router.patch('/:chatId', asyncHandler(chatController.updateChat));
  router.delete('/:chatId', asyncHandler(chatController.deleteChat));
  router.get('/:chatId/messages', asyncHandler(chatController.getMessages));

  return router;
};
