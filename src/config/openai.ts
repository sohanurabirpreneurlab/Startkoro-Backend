import OpenAI from 'openai';
import { env } from './env';

// Keep the OpenAI client on the backend only so API keys stay private.
export const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY
});
