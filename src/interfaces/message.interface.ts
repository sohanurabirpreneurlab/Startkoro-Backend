export interface IMessage {
  id: string;
  chat_id: string;
  sender: 'user' | 'assistant' | 'system';
  content: string;
  tokens_used?: number;
  model?: string | null;
  created_at?: string;
}
