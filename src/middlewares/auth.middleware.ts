import { NextFunction, RequestHandler, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { IAuthenticatedRequest, IAuthTokenPayload } from '../interfaces/user.interface';
import { AppError } from '../utils/AppError';

export const authMiddleware: RequestHandler = (
  req,
  _res: Response,
  next: NextFunction
): void => {
  const authenticatedRequest = req as IAuthenticatedRequest;
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return next(new AppError('Authorization token is required.', 401));
  }

  const token = authHeader.split(' ')[1];

  try {
    // The JWT only stores basic identity data, not secrets.
    const decoded = jwt.verify(token, env.JWT_SECRET) as IAuthTokenPayload;
    authenticatedRequest.user = decoded;
    next();
  } catch (error) {
    next(new AppError('Invalid or expired token.', 401, error));
  }
};
