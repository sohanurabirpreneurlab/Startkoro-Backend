import { NextFunction, Request, Response } from 'express';

type AsyncController<TRequest extends Request = Request> = (
  req: TRequest,
  res: Response,
  next: NextFunction
) => Promise<unknown>;

export const asyncHandler =
  <TRequest extends Request = Request>(controller: AsyncController<TRequest>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    controller(req as TRequest, res, next).catch(next);
  };
