import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { sendError } from '../utils/apiResponse';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email?: string;
  };
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return sendError(res, 'Access token requis.', 401, 'MISSING_ACCESS_TOKEN');

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('JWT_SECRET is not defined');
    return sendError(res, 'Configuration serveur invalide.', 500, 'SERVER_CONFIG_ERROR');
  }

  jwt.verify(token, secret, (err: any, user: any) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return sendError(res, 'Token expire.', 401, 'TOKEN_EXPIRED');
      }
      return sendError(res, 'Token invalide.', 401, 'INVALID_TOKEN');
    }

    (req as AuthenticatedRequest).user = user;
    next();
  });
};
