import { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { ZodError } from 'zod';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';

export const errorMiddleware = (
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Log the raw server error once here so debugging does not depend on the client response shape.
  logger.error('Unhandled request error.', {
    method: req.method,
    url: req.originalUrl,
    error
  });

  if (error instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: 'Validation failed.',
      errors: error.flatten()
    });
    return;
  }

  if (error instanceof multer.MulterError) {
    res.status(400).json({
      success: false,
      message:
        error.code === 'LIMIT_FILE_SIZE'
          ? 'Uploaded file is too large. Maximum allowed size is 5MB.'
          : error.message
    });
    return;
  }

  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      message: error.message,
      details: error.details ?? null
    });
    return;
  }

  res.status(500).json({
    success: false,
    message:
      env.NODE_ENV === 'development' ? error.message || 'Unknown server error.' : 'Something went wrong on the server.',
    details:
      env.NODE_ENV === 'development'
        ? {
            name: error.name,
            stack: error.stack ?? null
          }
        : null
  });
};
