import { Request, Response, NextFunction } from "express";

/**
 * Wraps an async express middleware/controller function to catch errors and pass them to the next() function.
 * Removes the need for try/catch blocks in every controller method.
 */
export const catchAsync = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
};
