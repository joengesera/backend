"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResetPassword = exports.forgotPassword = exports.logout = exports.RefreshToken = exports.login = exports.register = void 0;
const AuthServices_1 = require("../services/AuthServices");
const apiResponse_1 = require("../utils/apiResponse");
// CORRECTIF: register ne devait pas appeler generateTokens manuellement —
// login() le fait déjà en interne. On appelle login() après le register
// pour obtenir les tokens en une seule passe.
const register = async (req, res) => {
    try {
        const { email, name, password, role } = req.body;
        const user = await AuthServices_1.AuthService.register(email, name, password, role);
        const tokens = await AuthServices_1.AuthService.generateTokens(user.id);
        (0, apiResponse_1.sendSuccess)(res, { user, tokens }, 201);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur interne';
        if (message.toLowerCase().includes('unique') || message.toLowerCase().includes('already')) {
            return (0, apiResponse_1.sendError)(res, 'Un compte avec cet email existe déjà.', 409, 'EMAIL_TAKEN');
        }
        (0, apiResponse_1.sendError)(res, message, 500);
    }
};
exports.register = register;
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const { user, tokens } = await AuthServices_1.AuthService.login(email, password);
        (0, apiResponse_1.sendSuccess)(res, { user, tokens });
    }
    catch (error) {
        (0, apiResponse_1.sendError)(res, 'Identifiants invalides.', 401, 'INVALID_CREDENTIALS');
    }
};
exports.login = login;
const RefreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return (0, apiResponse_1.sendError)(res, 'Refresh token requis.', 400, 'MISSING_REFRESH_TOKEN');
        }
        const tokens = await AuthServices_1.AuthService.refreshToken(refreshToken);
        (0, apiResponse_1.sendSuccess)(res, tokens);
    }
    catch {
        (0, apiResponse_1.sendError)(res, 'Refresh token invalide ou expiré.', 401, 'INVALID_REFRESH_TOKEN');
    }
};
exports.RefreshToken = RefreshToken;
const logout = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (refreshToken) {
            await AuthServices_1.AuthService.logout(refreshToken);
        }
        // CORRECTIF: logout silencieux même si le token est déjà révoqué
        (0, apiResponse_1.sendSuccess)(res, { message: 'Déconnexion réussie.' });
    }
    catch {
        (0, apiResponse_1.sendSuccess)(res, { message: 'Déconnexion réussie.' });
    }
};
exports.logout = logout;
// CORRECTIF: le service ne doit plus throw sur user introuvable (cf. AuthServices.ts corrigé).
// Le contrôleur reste uniforme — même réponse qu'il y ait un compte ou non.
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        await AuthServices_1.AuthService.forgotPassword(email);
    }
    catch {
        // Intentionnellement silencieux
    }
    finally {
        (0, apiResponse_1.sendSuccess)(res, {
            message: "Si ce compte existe, un email de réinitialisation a été envoyé.",
        });
    }
};
exports.forgotPassword = forgotPassword;
const ResetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        await AuthServices_1.AuthService.resetPassword(token, newPassword);
        (0, apiResponse_1.sendSuccess)(res, { message: 'Mot de passe réinitialisé avec succès.' });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Requête invalide';
        (0, apiResponse_1.sendError)(res, message, 400, 'INVALID_RESET_TOKEN');
    }
};
exports.ResetPassword = ResetPassword;
