import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { db } from '../lib/db';
import { EmailService } from './emailService';

const SALT_ROUNDS = 12; // CORRECTIF: 10 est le minimum viable, 12 est recommandé en 2024+

function getJwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET must be defined');
    return secret;
}

function getRefreshJwtSecret(): string {
    const secret = process.env.JWT_REFRESH_SECRET;
    if (!secret) throw new Error('JWT_REFRESH_SECRET must be defined');
    return secret;
}

function hashResetToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
}

export class AuthService {
    static async generateTokens(userId: string) {
        const accessToken = jwt.sign({ userId }, getJwtSecret(), { expiresIn: '15m' });
        const refreshToken = jwt.sign({ userId }, getRefreshJwtSecret(), { expiresIn: '10d' });

        await db.refreshToken.create({
            data: {
                token: refreshToken,
                userId,
                expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
            },
        });

        return { accessToken, refreshToken };
    }

    static async refreshToken(refreshToken: string) {
        // CORRECTIF: vérifier en DB AVANT de vérifier la signature JWT
        // pour invalider immédiatement les tokens révoqués
        const dbToken = await db.refreshToken.findUnique({
            where: { token: refreshToken },
        });

        if (!dbToken || dbToken.expiresAt < new Date()) {
            throw new Error('Token invalide ou expiré');
        }

        let payload: jwt.JwtPayload;
        try {
            payload = jwt.verify(refreshToken, getRefreshJwtSecret()) as jwt.JwtPayload;
        } catch {
            // Token DB présent mais signature invalide → révoquer par sécurité
            await db.refreshToken.delete({ where: { token: refreshToken } });
            throw new Error('Token invalide');
        }

        if (!payload.userId || typeof payload.userId !== 'string') {
            throw new Error('Token invalide');
        }

        // Rotation: supprimer l'ancien, créer le nouveau
        await db.refreshToken.delete({ where: { token: refreshToken } });
        return this.generateTokens(payload.userId);
    }

    static async logout(refreshToken: string): Promise<void> {
        // CORRECTIF: ne pas throw si le token n'existe pas (déjà révoqué = OK)
        await db.refreshToken.deleteMany({ where: { token: refreshToken } });
    }

    static async register(
        email: string,
        name: string,
        password: string,
        role: 'STUDENT' | 'PROFESSOR' = 'STUDENT'
    ) {
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        const user = await db.user.create({
            data: { email, name, passwordHash: hashedPassword, role },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        if (role === 'PROFESSOR') {
            await db.professor.create({ data: { userId: user.id } });
        }

        return user;
    }

    static async login(email: string, password: string) {
        const user = await db.user.findUnique({ where: { email } });

        // CORRECTIF: comparer le hash même si l'utilisateur n'existe pas
        // pour éviter le timing attack (user enumeration via temps de réponse)
        const DUMMY_HASH = '$2b$12$invalidhashfortimingprotectiononly.........';
        const isValid = user
            ? await bcrypt.compare(password, user.passwordHash)
            : await bcrypt.compare(password, DUMMY_HASH).then(() => false);

        if (!user || !isValid) {
            throw new Error('Identifiants invalides');
        }

        const tokens = await this.generateTokens(user.id);

        return {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            },
            tokens,
        };
    }

    static async forgotPassword(email: string): Promise<void> {
        const user = await db.user.findUnique({ where: { email } });

        // CORRECTIF: ne plus throw si le user n'existe pas.
        // Le contrôleur renvoie toujours la même réponse → pas de user enumeration.
        if (!user) return;

        const resetToken = crypto.randomBytes(32).toString('hex');
        const hashedResetToken = hashResetToken(resetToken);
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

        await db.user.update({
            where: { id: user.id },
            data: { resetPasswordToken: hashedResetToken, resetPasswordExpiresAt: expiresAt },
        });

        await EmailService.sendResetPasswordEmail(email, resetToken);
    }

    static async resetPassword(token: string, newPassword: string): Promise<void> {
        const hashedToken = hashResetToken(token);

        const user = await db.user.findFirst({
            where: {
                resetPasswordToken: hashedToken,
                resetPasswordExpiresAt: { gte: new Date() },
            },
        });

        if (!user) throw new Error('Token invalide ou expiré');

        const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

        await db.user.update({
            where: { id: user.id },
            data: {
                passwordHash: hashedPassword,
                resetPasswordToken: null,
                resetPasswordExpiresAt: null,
            },
        });

        // CORRECTIF: invalider tous les refresh tokens de l'utilisateur
        // après un reset de mot de passe (bonne pratique sécurité)
        await db.refreshToken.deleteMany({ where: { userId: user.id } });
    }
}