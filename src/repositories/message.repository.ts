import { db } from '../config/database';
import { IMessage } from '../interfaces/message.interface';
import { AppError } from '../utils/AppError';

export class MessageRepository {
  async createMessage(
    payload: Pick<IMessage, 'chat_id' | 'sender' | 'content' | 'tokens_used' | 'model'>
  ): Promise<IMessage> {
    try {
      const result = await db.query<IMessage>(
        `
          insert into messages (chat_id, sender, content, tokens_used, model)
          values ($1, $2, $3, $4, $5)
          returning *
        `,
        [payload.chat_id, payload.sender, payload.content, payload.tokens_used, payload.model]
      );

      return result.rows[0];
    } catch (error) {
      throw new AppError('Failed to save message.', 500, error);
    }
  }

  async getMessagesByChatId(chatId: string): Promise<IMessage[]> {
    try {
      const result = await db.query<IMessage>(
        'select * from messages where chat_id = $1 order by created_at asc',
        [chatId]
      );
      return result.rows;
    } catch (error) {
      throw new AppError('Failed to load messages.', 500, error);
    }
  }

  async getRecentMessages(chatId: string, limit = 10): Promise<IMessage[]> {
    try {
      const result = await db.query<IMessage>(
        'select * from messages where chat_id = $1 order by created_at desc limit $2',
        [chatId, limit]
      );

      // The newest records come first here, so we reverse them before passing them to the AI prompt.
      return result.rows.reverse();
    } catch (error) {
      throw new AppError('Failed to load recent messages.', 500, error);
    }
  }
}
