import { IRetrievedChunk } from './document-chunk.interface';
import { IMessage } from './message.interface';

export interface IChat {
  id: string;
  user_id: string;
  title: string | null;
  status: 'active' | 'archived';
  created_at?: string;
  updated_at?: string;
}

export interface SendMessagePayload {
  chatId?: string;
  message: string;
}

export interface SendMessageResult {
  chatId: string;
  userMessage: IMessage;
  assistantMessage: IMessage;
  retrievedChunks: IRetrievedChunk[];
}
