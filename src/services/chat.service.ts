import { IChat, SendMessagePayload, SendMessageResult } from '../interfaces/chat.interface';
import { ChatRepository } from '../repositories/chat.repository';
import { AppError } from '../utils/AppError';
import { AIService } from './ai.service';
import { EmbeddingService } from './embedding.service';
import { MessageService } from './message.service';
import { RealtimeService } from './realtime.service';
import { VectorService } from './vector.service';

export class ChatService {
  constructor(
    private readonly chatRepository: ChatRepository,
    private readonly messageService: MessageService,
    private readonly embeddingService: EmbeddingService,
    private readonly vectorService: VectorService,
    private readonly aiService: AIService,
    private readonly realtimeService: RealtimeService
  ) {}

  async createNewChat(userId: string, title?: string): Promise<IChat> {
    return this.chatRepository.createChat({
      user_id: userId,
      title: title?.trim() || 'New Chat'
    });
  }

  async listUserChats(userId: string): Promise<IChat[]> {
    return this.chatRepository.listByUserId(userId);
  }

  async getChatById(chatId: string, userId: string): Promise<IChat> {
    // Ownership checks stop users from reading or writing another user's conversation.
    const chat = await this.chatRepository.findByIdAndUserId(chatId, userId);

    if (!chat) {
      throw new AppError('Chat not found.', 404);
    }

    return chat;
  }

  async updateChatTitle(chatId: string, userId: string, title: string): Promise<IChat> {
    await this.getChatById(chatId, userId);
    return this.chatRepository.updateTitle(chatId, userId, title.trim());
  }

  async archiveChat(chatId: string, userId: string): Promise<IChat> {
    await this.getChatById(chatId, userId);
    return this.chatRepository.archiveChat(chatId, userId);
  }

  async deleteChat(chatId: string, userId: string): Promise<IChat> {
    await this.getChatById(chatId, userId);
    return this.chatRepository.deleteChat(chatId, userId);
  }

  async sendMessage(userId: string, payload: SendMessagePayload): Promise<SendMessageResult> {
    const trimmedMessage = payload.message.trim();

    if (!trimmedMessage) {
      throw new AppError('Message is required.', 400);
    }

    let chat: IChat;

    if (payload.chatId) {
      // Existing chats must belong to the current user before we allow new messages in them.
      chat = await this.getChatById(payload.chatId, userId);
    } else {
      // We create the chat only after the first message so empty chat pages do not create empty records.
      chat = await this.createNewChat(userId, this.generateChatTitle(trimmedMessage));
    }

    if (chat.status !== 'active') {
      throw new AppError('Only active chats can receive new messages.', 400);
    }

    // We save the user's message first so the database remains the source of truth for the conversation.
    const userMessage = await this.messageService.createUserMessage(chat.id, trimmedMessage);

    // The embedding turns the user's text into a vector so we can search for semantically similar knowledge.
    const queryEmbedding = await this.embeddingService.generateEmbedding(trimmedMessage);
    const retrievedChunks = await this.vectorService.searchSimilarChunks(queryEmbedding, 5);

    // We send only recent history to OpenAI so the prompt stays relevant and cost stays predictable.
    const recentMessages = await this.messageService.getRecentMessages(chat.id, 10);

    const aiResponse = await this.aiService.generateAnswer({
      userMessage: trimmedMessage,
      recentMessages,
      retrievedChunks
    });

    // We persist the assistant reply too, so reopening the chat shows the full conversation history.
    const assistantMessage = await this.messageService.createAssistantMessage(
      chat.id,
      aiResponse.answer,
      aiResponse.tokensUsed ?? 0,
      aiResponse.model
    );

    // Realtime updates help every open client show the same saved messages immediately.
    this.realtimeService.emitChatMessageCreated(userId, {
      chatId: chat.id,
      chatTitle: chat.title,
      userMessage,
      assistantMessage
    });

    return {
      chatId: chat.id,
      userMessage,
      assistantMessage,
      retrievedChunks
    };
  }

  private generateChatTitle(message: string): string {
    const normalized = message.replace(/\s+/g, ' ').trim();
    const words = normalized.split(' ').slice(0, 6).join(' ');

    // A simple title from the first message keeps new chats understandable without another AI call.
    return words.length > 60 ? `${words.slice(0, 57)}...` : words || 'New Chat';
  }
}
