import { Request, Response } from "express";
import { db } from "../lib/db";

export const getProfile = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Non authentifie" });
        }

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

        if (!user) {
            return res.status(404).json({ success: false, message: "Utilisateur introuvable" });
        }

        res.json({ success: true, data: user });
    } catch (error) {
        console.error("Error fetching profile:", error);
        res.status(500).json({ success: false, message: "Erreur serveur" });
    }
};

export const updateProfile = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Non authentifie" });
        }

        const { name, email } = req.body;
        if (!name || !email) {
            return res.status(400).json({ success: false, message: "Nom et email sont requis" });
        }
        if (!String(email).includes("@")) {
            return res.status(400).json({ success: false, message: "Email invalide" });
        }

        const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
        if (existing && existing.id !== userId) {
            return res.status(400).json({ success: false, message: "Email deja utilise" });
        }

        const user = await db.user.update({
            where: { id: userId },
            data: { name, email },
            select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
                language: true,
                timezone: true
            }
        });

        res.json({ success: true, message: "Profil mis a jour avec succes", data: user });
    } catch (error) {
        console.error("Error updating profile:", error);
        res.status(500).json({ success: false, message: "Erreur lors de la mise a jour du profil" });
    }
};
