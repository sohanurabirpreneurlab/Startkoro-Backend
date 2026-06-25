import { Response } from 'express';
import { z } from 'zod';
import { IAuthenticatedRequest } from '../interfaces/user.interface';
import { AppError } from '../utils/AppError';
import { ChatService } from '../services/chat.service';
import { MessageService } from '../services/message.service';

const createChatSchema = z.object({
  title: z.string().min(1).max(200).optional()
});

const updateChatSchema = z.object({
  title: z.string().min(1).max(200)
});

const sendMessageSchema = z.object({
  chatId: z.string().uuid().optional(),
  message: z.string().min(1, 'Message is required').max(10000)
});

const chatParamsSchema = z.object({
  chatId: z.string().uuid()
});

export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly messageService: MessageService
  ) {}

  createChat = async (req: IAuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user?.sub;

    if (!userId) {
      throw new AppError('User authentication is required.', 401);
    }

    const payload = createChatSchema.parse(req.body);
    const chat = await this.chatService.createNewChat(userId, payload.title);

    res.status(201).json({
      success: true,
      data: chat
    });
  };

  listChats = async (req: IAuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user?.sub;

    if (!userId) {
      throw new AppError('User authentication is required.', 401);
    }

    const chats = await this.chatService.listUserChats(userId);

    res.status(200).json({
      success: true,
      data: chats
    });
  };

  getChat = async (req: IAuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user?.sub;

    if (!userId) {
      throw new AppError('User authentication is required.', 401);
    }

    const { chatId } = chatParamsSchema.parse(req.params);
    const chat = await this.chatService.getChatById(chatId, userId);

    res.status(200).json({
      success: true,
      data: chat
    });
  };

  updateChat = async (req: IAuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user?.sub;

    if (!userId) {
      throw new AppError('User authentication is required.', 401);
    }

    const { chatId } = chatParamsSchema.parse(req.params);
    const payload = updateChatSchema.parse(req.body);
    const updatedChat = await this.chatService.updateChatTitle(chatId, userId, payload.title);

    res.status(200).json({
      success: true,
      data: updatedChat
    });
  };

  deleteChat = async (req: IAuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user?.sub;

    if (!userId) {
      throw new AppError('User authentication is required.', 401);
    }

    const { chatId } = chatParamsSchema.parse(req.params);
    const deletedChat = await this.chatService.deleteChat(chatId, userId);

    res.status(200).json({
      success: true,
      message: 'Chat deleted successfully.',
      data: deletedChat
    });
  };

  sendMessage = async (req: IAuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user?.sub;

    if (!userId) {
      throw new AppError('User authentication is required.', 401);
    }

    const payload = sendMessageSchema.parse(req.body);
    const result = await this.chatService.sendMessage(userId, payload);

    res.status(200).json({
      success: true,
      data: result
    });
  };

  getMessages = async (req: IAuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user?.sub;

    if (!userId) {
      throw new AppError('User authentication is required.', 401);
    }

    const { chatId } = chatParamsSchema.parse(req.params);
    await this.chatService.getChatById(chatId, userId);
    const messages = await this.messageService.getMessagesByChatId(chatId);

    res.status(200).json({
      success: true,
      data: messages
    });
  };
}
