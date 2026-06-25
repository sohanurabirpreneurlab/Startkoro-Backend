import { Pool, QueryResultRow } from 'pg';
import { env } from './env';

// One shared pool is enough for the whole API and keeps connection handling simple.
const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl:
    env.NODE_ENV === 'production'
      ? {
          rejectUnauthorized: false
        }
      : false
});

export const db = {
  query<T extends QueryResultRow>(text: string, params: unknown[] = []) {
    return pool.query<T>(text, params);
  }
};

export const formatVector = (values: number[]): string => {
  // pgvector accepts this string shape: [0.12,0.34,...]
  return `[${values.join(',')}]`;
};
