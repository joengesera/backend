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
    catch (error) {
        res.status(500).json({ error: error.message });
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
        res.status(500).json({ error: error.message });
    }
};
exports.login = login;
const RefreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken)
            return res.status(400).json({ error: "Refresh token requis" });
        const tokens = await AuthServices_1.AuthService.refreshToken(refreshToken);
        res.json(tokens);
    }
    catch (error) {
        res.status(401).json({ error: error.message });
    }
};
exports.RefreshToken = RefreshToken;
const logout = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (refreshToken)
            await AuthServices_1.AuthService.logout(refreshToken);
        res.json({ message: "Déconnexion réussie" });
    }
    catch (error) {
        res.json({ message: "Déconnexion réussie" }); // On ne bloque pas le logout si erreur
    }
};
exports.logout = logout;
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const token = await AuthServices_1.AuthService.forgotPassword(email);
        // await EmailService.sendResetPasswordEmail(email, token); // Commented out to avoid crash if EmailService is not configured
        // For MVP, return token in response so we can test without email
        res.status(200).json({
            message: "Email de reinitialisation (simulé) envoyé",
            devToken: token
        });
    }
    catch (error) {
        res.status(500).json({
            error: error.message
        });
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
        res.status(400).json({ error: error.message });
    }
};
exports.ResetPassword = ResetPassword;
