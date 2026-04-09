import { Request, Response, NextFunction } from 'express';
import { ZodObject, ZodError } from 'zod';
import { AppError } from '../errors/AppError';

/**
 * Middleware to validate request data using Zod.
 * Checks body, query, and params.
 */
export const validate = (schema: {
  body?: ZodObject<any>;
  query?: ZodObject<any>;
  params?: ZodObject<any>;
}) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schema.body) {
        req.body = await schema.body.parseAsync(req.body);
      }
      if (schema.query) {
        const parsedQuery = await schema.query.parseAsync(req.query);
        Object.defineProperty(req, 'query', {
          value: parsedQuery,
          writable: true,
          configurable: true,
          enumerable: true
        });
      }
      if (schema.params) {
        const parsedParams = await schema.params.parseAsync(req.params);
        Object.defineProperty(req, 'params', {
          value: parsedParams,
          writable: true,
          configurable: true,
          enumerable: true
        });
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const message = error.issues.map((i) => i.message).join(', ');
        return next(new AppError(`Validation échouée: ${message}`, 400));
      }
      next(error);
    }
  };
};
