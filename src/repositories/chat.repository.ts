import { db } from '../config/database';
import { IChat } from '../interfaces/chat.interface';
import { AppError } from '../utils/AppError';

export class ChatRepository {
  async createChat(payload: Pick<IChat, 'user_id' | 'title'>): Promise<IChat> {
    try {
      const result = await db.query<IChat>(
        `
          insert into chats (user_id, title)
          values ($1, $2)
          returning *
        `,
        [payload.user_id, payload.title ?? null]
      );

      return result.rows[0];
    } catch (error) {
      throw new AppError('Failed to create chat.', 500, error);
    }
  }

  async findByIdAndUserId(chatId: string, userId: string): Promise<IChat | null> {
    try {
      const result = await db.query<IChat>(
        'select * from chats where id = $1 and user_id = $2 limit 1',
        [chatId, userId]
      );

      return result.rows[0] ?? null;
    } catch (error) {
      throw new AppError('Failed to fetch chat.', 500, error);
    }
  }

  async listByUserId(userId: string): Promise<IChat[]> {
    try {
      const result = await db.query<IChat>(
        'select * from chats where user_id = $1 order by updated_at desc',
        [userId]
      );
      return result.rows;
    } catch (error) {
      throw new AppError('Failed to list chats.', 500, error);
    }
  }

  async updateTitle(chatId: string, userId: string, title: string): Promise<IChat> {
    try {
      const result = await db.query<IChat>(
        `
          update chats
          set title = $3
          where id = $1 and user_id = $2
          returning *
        `,
        [chatId, userId, title]
      );

      const chat = result.rows[0];

      if (!chat) {
        throw new AppError('Chat not found.', 404);
      }

      return chat;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError('Failed to fetch chat.', 500, error);
    }
  }

  async archiveChat(chatId: string, userId: string): Promise<IChat> {
    try {
      const result = await db.query<IChat>(
        `
          update chats
          set status = 'archived'
          where id = $1 and user_id = $2
          returning *
        `,
        [chatId, userId]
      );

      const chat = result.rows[0];

      if (!chat) {
        throw new AppError('Chat not found.', 404);
      }

      return chat;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError('Failed to update chat.', 500, error);
    }
  }

  async deleteChat(chatId: string, userId: string): Promise<IChat> {
    try {
      const result = await db.query<IChat>(
        `
          delete from chats
          where id = $1 and user_id = $2
          returning *
        `,
        [chatId, userId]
      );

      const chat = result.rows[0];

      if (!chat) {
        throw new AppError('Chat not found.', 404);
      }

      return chat;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError('Failed to delete chat.', 500, error);
    }
  }
}
