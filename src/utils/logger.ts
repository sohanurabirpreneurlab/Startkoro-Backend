import { env } from '../config/env';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogContext = Record<string, unknown>;

const LOG_LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};

const ACTIVE_LOG_LEVEL: LogLevel = env.NODE_ENV === 'production' ? 'info' : 'debug';

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_ORDER[level] >= LOG_LEVEL_ORDER[ACTIVE_LOG_LEVEL];
}

function normalizeValue(value: unknown): unknown {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack ?? null
    };
  }

  return value;
}

function formatContext(context?: LogContext): string {
  if (!context || Object.keys(context).length === 0) {
    return '';
  }

  const normalizedContext = Object.fromEntries(
    Object.entries(context).map(([key, value]) => [key, normalizeValue(value)])
  );

  return ` ${JSON.stringify(normalizedContext)}`;
}

function write(level: LogLevel, message: string, context?: LogContext): void {
  if (!shouldLog(level)) {
    return;
  }

  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] [${level.toUpperCase()}] ${message}${formatContext(context)}`;

  if (level === 'error') {
    console.error(line);
    return;
  }

  if (level === 'warn') {
    console.warn(line);
    return;
  }

  console.log(line);
}

export const logger = {
  debug(message: string, context?: LogContext): void {
    write('debug', message, context);
  },

  info(message: string, context?: LogContext): void {
    write('info', message, context);
  },

  warn(message: string, context?: LogContext): void {
    write('warn', message, context);
  },

  error(message: string, context?: LogContext): void {
    write('error', message, context);
  }
};
