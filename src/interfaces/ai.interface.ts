import { IMessage } from './message.interface';
import { IRetrievedChunk } from './document-chunk.interface';

export interface GenerateAnswerInput {
  userMessage: string;
  recentMessages: IMessage[];
  retrievedChunks: IRetrievedChunk[];
}

export interface GenerateAnswerResult {
  answer: string;
  model: string;
  tokensUsed?: number;
}
