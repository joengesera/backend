import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from '../lib/db';
import crypto from 'crypto';
import { EmailService } from './emailService';

const SALT_ROUNDS = 10;

function getJwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET must be defined');
    }
    return secret;
}

function getRefreshJwtSecret(): string {
    const secret = process.env.JWT_REFRESH_SECRET;
    if (!secret) {
        throw new Error('JWT_REFRESH_SECRET must be defined');
    }
    return secret;
}

function hashResetToken(token: string) {
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
                expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)
            }
        });

        return { accessToken, refreshToken };
    }

    static async refreshToken(refreshToken: string) {
        const payload = jwt.verify(refreshToken, getRefreshJwtSecret()) as jwt.JwtPayload;
        if (!payload.userId || typeof payload.userId !== 'string') {
            throw new Error('Token invalide');
        }

        const dbToken = await db.refreshToken.findUnique({
            where: { token: refreshToken }
        }) as { token: string; userId: string; expiresAt: Date } | null;

        if (!dbToken || dbToken.expiresAt < new Date()) {
            throw new Error('Token invalide');
        }

        const tokens = await this.generateTokens(payload.userId);
        await db.refreshToken.delete({ where: { token: refreshToken } });
        return tokens;
    }

    static async logout(refreshToken: string) {
        await db.refreshToken.delete({ where: { token: refreshToken } });
    }

    static async forgotPassword(email: string) {
        const user = await db.user.findUnique({ where: { email } });
        if (!user) {
            throw new Error('Utilisateur non trouvé');
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        const hashedResetToken = hashResetToken(resetToken);
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

        await db.user.update({
            where: { id: user.id },
            data: {
                resetPasswordToken: hashedResetToken,
                resetPasswordExpiresAt: expiresAt
            }
        });

        await EmailService.sendResetPasswordEmail(email, resetToken);
    }

    static async register(email: string, name: string, password: string) {
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        const user = await db.user.create({
            data: {
                email,
                name,
                passwordHash: hashedPassword
            },
            select: {
                id: true,
                email: true,
                name: true,
                createdAt: true,
                updatedAt: true
            }
        });
        return user;
    }

    static async login(email: string, password: string) {
        const user = await db.user.findUnique({ where: { email } });
        if (!user) {
            throw new Error('Utilisateur non trouvé');
        }

        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            throw new Error('Mot de passe incorrect');
        }

        const tokens = await this.generateTokens(user.id);

        return {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt
            },
            tokens
        };
    }

    static async resetPassword(token: string, newPassword: string) {
        const hashedToken = hashResetToken(token);
        const user = await db.user.findFirst({
            where: {
                resetPasswordToken: hashedToken,
                resetPasswordExpiresAt: {
                    gte: new Date()
                }
            }
        });

        if (!user) {
            throw new Error('Token invalide');
        }

        const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
        await db.user.update({
            where: { id: user.id },
            data: {
                passwordHash: hashedPassword,
                resetPasswordToken: null,
                resetPasswordExpiresAt: null
            }
        });
    }
}
