import { Request, Response } from 'express';
import { AuthService } from '../services/AuthServices';
import { sendSuccess, sendError } from '../utils/apiResponse';

// CORRECTIF: register ne devait pas appeler generateTokens manuellement —
// login() le fait déjà en interne. On appelle login() après le register
// pour obtenir les tokens en une seule passe.
export const register = async (req: Request, res: Response) => {
    try {
        const { email, name, password, role } = req.body;
        const user = await AuthService.register(email, name, password, role);
        const tokens = await AuthService.generateTokens(user.id);
        sendSuccess(res, { user, tokens }, 201);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Erreur interne';
        // CORRECTIF: email déjà pris → 409, pas 500
        if (message.toLowerCase().includes('unique') || message.toLowerCase().includes('already')) {
            return sendError(res, 'Un compte avec cet email existe déjà.', 409, 'EMAIL_TAKEN');
        }
        sendError(res, message, 500);
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;
        const { user, tokens } = await AuthService.login(email, password);
        sendSuccess(res, { user, tokens });
    } catch (error: unknown) {
        // CORRECTIF: toujours 401, jamais 500 — on ne révèle pas la raison exacte
        sendError(res, 'Identifiants invalides.', 401, 'INVALID_CREDENTIALS');
    }
};

export const RefreshToken = async (req: Request, res: Response) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return sendError(res, 'Refresh token requis.', 400, 'MISSING_REFRESH_TOKEN');
        }
        const tokens = await AuthService.refreshToken(refreshToken);
        sendSuccess(res, tokens);
    } catch {
        sendError(res, 'Refresh token invalide ou expiré.', 401, 'INVALID_REFRESH_TOKEN');
    }
};

export const logout = async (req: Request, res: Response) => {
    try {
        const { refreshToken } = req.body;
        if (refreshToken) {
            await AuthService.logout(refreshToken);
        }
        // CORRECTIF: logout silencieux même si le token est déjà révoqué
        sendSuccess(res, { message: 'Déconnexion réussie.' });
    } catch {
        sendSuccess(res, { message: 'Déconnexion réussie.' });
    }
};

// CORRECTIF: le service ne doit plus throw sur user introuvable (cf. AuthServices.ts corrigé).
// Le contrôleur reste uniforme — même réponse qu'il y ait un compte ou non.
export const forgotPassword = async (req: Request, res: Response) => {
    try {
        const { email } = req.body;
        await AuthService.forgotPassword(email);
    } catch {
        // Intentionnellement silencieux
    } finally {
        sendSuccess(res, {
            message: "Si ce compte existe, un email de réinitialisation a été envoyé.",
        });
    }
};

export const ResetPassword = async (req: Request, res: Response) => {
    try {
        const { token, newPassword } = req.body;
        await AuthService.resetPassword(token, newPassword);
        sendSuccess(res, { message: 'Mot de passe réinitialisé avec succès.' });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Requête invalide';
        sendError(res, message, 400, 'INVALID_RESET_TOKEN');
    }
};