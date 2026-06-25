import { NextFunction, RequestHandler, Response } from 'express';
import { IAuthenticatedRequest } from '../interfaces/user.interface';
import { AppError } from '../utils/AppError';

export const adminMiddleware: RequestHandler = (
  req,
  _res: Response,
  next: NextFunction
): void => {
  const authenticatedRequest = req as IAuthenticatedRequest;

  if (!authenticatedRequest.user) {
    return next(new AppError('User authentication is required.', 401));
  }

  if (authenticatedRequest.user.role !== 'admin') {
    return next(new AppError('Admin access is required.', 403));
  }

  next();
};
