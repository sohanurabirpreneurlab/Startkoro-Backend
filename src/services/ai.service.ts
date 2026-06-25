import { env } from '../config/env';
import { openai } from '../config/openai';
import { GenerateAnswerInput, GenerateAnswerResult } from '../interfaces/ai.interface';
import { IMessage } from '../interfaces/message.interface';
import { AppError } from '../utils/AppError';

export class AIService {
  private readonly systemPrompt =
    'You are StartKoro AI Assistant. Use the provided knowledge context when it is relevant and helpful. If no relevant knowledge context is available, still answer helpfully using your general reasoning. When the answer is based on general reasoning rather than stored knowledge, avoid presenting it as an official company policy. Do not invent company policy.';

  async generateAnswer(context: GenerateAnswerInput): Promise<GenerateAnswerResult> {
    const knowledgeContext = this.formatKnowledgeContext(context.retrievedChunks);
    const recentHistory = this.formatRecentMessages(context.recentMessages);

    // Retrieved chunks are passed as explicit context so the model grounds its answer in your stored knowledge.
    const response = await openai.chat.completions.create({
      model: env.OPENAI_CHAT_MODEL,
      messages: [
        {
          role: 'system',
          content: this.systemPrompt
        },
        {
          role: 'user',
          content: [
            'Knowledge Context:',
            knowledgeContext,
            '',
            'Recent Chat History:',
            recentHistory,
            '',
            'User Question:',
            context.userMessage
          ].join('\n')
        }
      ],
      temperature: 0.2
    });

    const answer = response.choices[0]?.message?.content?.trim();

    if (!answer) {
      throw new AppError('OpenAI did not return a valid assistant answer.', 500);
    }

    return {
      answer,
      model: response.model ?? env.OPENAI_CHAT_MODEL,
      tokensUsed: response.usage?.total_tokens ?? 0
    };
  }

  private formatKnowledgeContext(retrievedChunks: GenerateAnswerInput['retrievedChunks']): string {
    if (!retrievedChunks.length) {
      return 'No matching knowledge chunks were found for this question.';
    }

    return retrievedChunks
      .map((chunk, index) => `[Chunk ${index + 1} | similarity=${chunk.similarity.toFixed(4)}]\n${chunk.chunk_text}`)
      .join('\n\n');
  }

  private formatRecentMessages(messages: IMessage[]): string {
    if (!messages.length) {
      return 'No previous chat history.';
    }

    // We send only recent history to keep prompts smaller and focused on the active conversation.
    return messages.map((message) => `${message.sender}: ${message.content}`).join('\n');
  }
}
