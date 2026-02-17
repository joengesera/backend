import { Request, Response } from "express";
import { AuthService } from "../services/AuthServices";

export const register = async (req: Request, res: Response) => {
    try {
        const { email, name, password } = req.body;
        const user = await AuthService.register(email, name, password);
        const tokens = await AuthService.generateTokens(user.id);
        res.status(201).json({ user, tokens });
    } catch {
        res.status(500).json({ error: "Internal server error" });
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;
        const { user, tokens } = await AuthService.login(email, password);
        res.status(200).json({ user, tokens });
    } catch (error: any) {
        res.status(401).json({ error: error.message || "Identifiants invalides" });
    }
};

export const RefreshToken = async (req: Request, res: Response) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({ error: "Refresh token requis" });
        }
        const tokens = await AuthService.refreshToken(refreshToken);
        res.json(tokens);
    } catch {
        res.status(401).json({ error: "Refresh token invalide" });
    }
};

export const logout = async (req: Request, res: Response) => {
    try {
        const { refreshToken } = req.body;
        if (refreshToken) {
            await AuthService.logout(refreshToken);
        }
        res.json({ message: "Déconnexion réussie" });
    } catch {
        res.json({ message: "Déconnexion réussie" });
    }
};

export const forgotPassword = async (req: Request, res: Response) => {
    try {
        const { email } = req.body;
        await AuthService.forgotPassword(email);
        res.status(200).json({ message: "Si ce compte existe, un email de réinitialisation a été envoyé" });
    } catch {
        // Réponse identique pour limiter l'énumération de comptes
        res.status(200).json({ message: "Si ce compte existe, un email de réinitialisation a été envoyé" });
    }
};

export const ResetPassword = async (req: Request, res: Response) => {
    try {
        const { token, newPassword } = req.body;
        await AuthService.resetPassword(token, newPassword);
        res.status(200).json({ message: "Mot de passe réinitialisé avec succès" });
    } catch (error: any) {
        res.status(400).json({ error: error.message || "Requête invalide" });
    }
};
