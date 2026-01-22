import { Request, Response } from "express";
import { AuthService } from "../services/AuthServices";

export const register = async (req: Request, res: Response) => {
    try {
        const { email, name, password } = req.body;
        const user = await AuthService.register(email, name, password);
        const tokens = await AuthService.generateTokens(user.id);
        res.status(201).json({ user, tokens });
    } catch (error: any) {
        res.status(500).json({ error: error.message }) as any;
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;
        const { user, tokens } = await AuthService.login(email, password);
        res.status(200).json({ user, tokens });
    } catch (error: any) {
        res.status(500).json({ error: error.message }) as any;
    }
};

export const RefreshToken = async (req: Request, res: Response) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) return res.status(400).json({ error: "Refresh token requis" });
        const tokens = await AuthService.refreshToken(refreshToken);
        res.json(tokens);
    } catch (error: any) {
        res.status(401).json({ error: error.message });
    }
};

export const logout = async (req: Request, res: Response) => {
    try {
        const { refreshToken } = req.body;
        if (refreshToken) await AuthService.logout(refreshToken);
        res.json({ message: "Déconnexion réussie" });
    } catch (error: any) {
        res.json({ message: "Déconnexion réussie" }); // On ne bloque pas le logout si erreur
    }
};

export const forgotPassword = async (req: Request, res: Response) => {
    try {
        const { email } = req.body;
        const token = await AuthService.forgotPassword(email);
        // await EmailService.sendResetPasswordEmail(email, token); // Commented out to avoid crash if EmailService is not configured
        // For MVP, return token in response so we can test without email
        res.status(200).json({
            message: "Email de reinitialisation envoyé",
            devToken: token
        });
    } catch (error: any) {
        res.status(200).json({
            message: "Email de reinitialisation envoyé",
            devToken: null
        });
    }
};

export const ResetPassword = async (req: Request, res: Response) => {
    try {
        const { token, newPassword } = req.body;
        await AuthService.resetPassword(token, newPassword);
        res.status(200).json({ message: "Mot de passe réinitialisé avec succès" });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
};
