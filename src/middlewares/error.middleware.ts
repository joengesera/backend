import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export const globalErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
    logger.error({
      msg: 'Global Error Captured',
      path: req.path,
      method: req.method,
      error: err instanceof Error ? err.message : err,
      stack: err instanceof Error ? err.stack : undefined
    });

    if (res.headersSent) {
        return next(err);
    }

    const status = err.statusCode || err.status || 500;
    const message = err.message || 'Internal Server Error';

    res.status(status).json({
        success: false,
        error: {
            message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        }
    });
};
