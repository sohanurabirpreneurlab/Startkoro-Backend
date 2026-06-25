import { IMessage } from '../interfaces/message.interface';
import { MessageRepository } from '../repositories/message.repository';

export class MessageService {
  constructor(private readonly messageRepository: MessageRepository) {}

  async createUserMessage(chatId: string, content: string): Promise<IMessage> {
    return this.messageRepository.createMessage({
      chat_id: chatId,
      sender: 'user',
      content,
      tokens_used: 0,
      model: null
    });
  }

  async createAssistantMessage(
    chatId: string,
    content: string,
    tokensUsed: number,
    model: string
  ): Promise<IMessage> {
    return this.messageRepository.createMessage({
      chat_id: chatId,
      sender: 'assistant',
      content,
      tokens_used: tokensUsed,
      model
    });
  }

  async getMessagesByChatId(chatId: string): Promise<IMessage[]> {
    return this.messageRepository.getMessagesByChatId(chatId);
  }

  async getRecentMessages(chatId: string, limit = 10): Promise<IMessage[]> {
    return this.messageRepository.getRecentMessages(chatId, limit);
  }
}
