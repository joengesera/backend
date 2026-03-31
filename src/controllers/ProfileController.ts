import { Request, Response } from 'express';
import { db } from '../lib/db';
import { sendError, sendSuccess } from '../utils/apiResponse';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

const getUserId = (req: Request): string | undefined =>
  (req as AuthenticatedRequest).user?.userId;

export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return sendError(res, 'Non authentifie.', 401, 'UNAUTHORIZED');

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        language: true,
        timezone: true
      }
    });

    if (!user) return sendError(res, 'Utilisateur introuvable.', 404, 'USER_NOT_FOUND');

    sendSuccess(res, user);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur';
    sendError(res, message);
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return sendError(res, 'Non authentifie.', 401, 'UNAUTHORIZED');

    const { name, email, language, timezone, avatarUrl } = req.body;

    if (!name || !email) return sendError(res, 'Nom et email sont requis.', 400, 'MISSING_FIELDS');
    if (!String(email).includes('@')) return sendError(res, 'Email invalide.', 400, 'INVALID_EMAIL');
    if (language !== undefined && String(language).trim().length === 0) return sendError(res, 'Langue invalide.', 400, 'INVALID_LANGUAGE');
    if (timezone !== undefined && String(timezone).trim().length === 0) return sendError(res, 'Fuseau horaire invalide.', 400, 'INVALID_TIMEZONE');
    if (avatarUrl !== undefined && avatarUrl !== null && String(avatarUrl).trim().length > 500) {
      return sendError(res, 'Avatar URL trop long.', 400, 'INVALID_AVATAR');
    }

    const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
    if (existing && existing.id !== userId) return sendError(res, 'Email deja utilise.', 400, 'EMAIL_TAKEN');

    const user = await db.user.update({
      where: { id: userId },
      data: {
        name,
        email,
        language: language !== undefined ? String(language) : undefined,
        timezone: timezone !== undefined ? String(timezone) : undefined,
        avatarUrl: avatarUrl === undefined ? undefined : (avatarUrl ? String(avatarUrl) : null)
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        language: true,
        timezone: true
      }
    });

    sendSuccess(res, user);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur lors de la mise a jour du profil';
    sendError(res, message);
  }
};
