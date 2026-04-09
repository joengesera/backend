import { Request, Response, NextFunction } from 'express';
import { db } from '../lib/db';
import { AuthenticatedRequest } from './auth.middleware';
import { sendError } from '../utils/apiResponse';

export const requireProfessorRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.userId;

    if (!userId) return sendError(res, 'Non authentifie.', 401, 'UNAUTHORIZED');

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    if (!user || user.role !== 'PROFESSOR') {
      return sendError(res, 'Acces reserve aux professeurs.', 403, 'FORBIDDEN');
    }

    next();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    sendError(res, message);
  }
};
