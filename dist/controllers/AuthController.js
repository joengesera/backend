"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResetPassword = exports.forgotPassword = exports.logout = exports.RefreshToken = exports.login = exports.register = void 0;
const AuthServices_1 = require("../services/AuthServices");
const register = async (req, res) => {
    try {
        const { email, name, password } = req.body;
        const user = await AuthServices_1.AuthService.register(email, name, password);
        const tokens = await AuthServices_1.AuthService.generateTokens(user.id);
        res.status(201).json({ user, tokens });
    }
    catch {
        res.status(500).json({ error: "Internal server error" });
    }
};
exports.register = register;
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const { user, tokens } = await AuthServices_1.AuthService.login(email, password);
        res.status(200).json({ user, tokens });
    }
    catch (error) {
        res.status(401).json({ error: error.message || "Identifiants invalides" });
    }
};
exports.login = login;
const RefreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({ error: "Refresh token requis" });
        }
        const tokens = await AuthServices_1.AuthService.refreshToken(refreshToken);
        res.json(tokens);
    }
    catch {
        res.status(401).json({ error: "Refresh token invalide" });
    }
};
exports.RefreshToken = RefreshToken;
const logout = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (refreshToken) {
            await AuthServices_1.AuthService.logout(refreshToken);
        }
        res.json({ message: "Déconnexion réussie" });
    }
    catch {
        res.json({ message: "Déconnexion réussie" });
    }
};
exports.logout = logout;
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        await AuthServices_1.AuthService.forgotPassword(email);
        res.status(200).json({ message: "Si ce compte existe, un email de réinitialisation a été envoyé" });
    }
    catch {
        // Réponse identique pour limiter l'énumération de comptes
        res.status(200).json({ message: "Si ce compte existe, un email de réinitialisation a été envoyé" });
    }
};
exports.forgotPassword = forgotPassword;
const ResetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        await AuthServices_1.AuthService.resetPassword(token, newPassword);
        res.status(200).json({ message: "Mot de passe réinitialisé avec succès" });
    }
    catch (error) {
        res.status(400).json({ error: error.message || "Requête invalide" });
    }
};
exports.ResetPassword = ResetPassword;
