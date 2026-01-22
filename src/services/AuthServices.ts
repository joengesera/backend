import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from '../lib/db';
import crypto from 'crypto';
import { EmailService } from './emailService';


const SALT_ROUNDS = 10;
const JWT_SECRET: string = String(process.env.JWT_SECRET)
const JWT_REFRESH_SECRET: string = String(process.env.JWT_REFRESH_SECRET)

if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
    throw new Error("JWT_SECRET or JWT_REFRESH_SECRET must be defined")
}

export class AuthService {

    // Génération des tokens
    static async generateTokens(userId: string) {
        const accessToken = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '15m' });
        const refreshToken = jwt.sign({ userId }, JWT_REFRESH_SECRET, { expiresIn: '10d' });

        await db.refreshToken.create({
            data: {
                token: refreshToken,
                userId: userId,
                expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)
            }
        })

        return { accessToken, refreshToken };
    }

    // Logique de refresh
    static async refreshToken(refreshToken: string) {
        const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as { userId: string };
        const dbToken = await db.refreshToken.findUnique({ where: { token: refreshToken } }) as { token: string; userId: string; expiresAt: Date } | null;

        if (!dbToken || dbToken.expiresAt < new Date(Date.now())) {
            throw new Error("Token invalide");
        }
        // On genere un nouvel access token et un nouveau refresh token
        const tokens = await this.generateTokens(payload.userId);
        // On supprime le token refresh
        await db.refreshToken.delete({ where: { token: refreshToken } });
        return tokens;
    }

    // Logique de logout
    static async logout(refreshToken: string) {
        await db.refreshToken.delete({ where: { token: refreshToken } });

    }

    // Mot de passe oublie
    static async forgotPassword(email: string) {
        const user = await db.user.findUnique({ where: { email } });
        if (!user) throw new Error("Utilisateur non trouvé");

        const resetToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 600 * 1000); // 1 heure

        await db.user.update({
            where: { id: user.id },
            data: {
                resetPasswordToken: resetToken,
                resetPasswordExpiresAt: expiresAt
            }
        });

        await EmailService.sendResetPasswordEmail(email, resetToken);

        return { message: "Email de réinitialisation envoyé" };
    }
    // Inscription 
    static async register(email: string, name: string, password: string) {
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        const user = await db.user.create({
            data: {
                email,
                name,
                passwordHash: hashedPassword
            }
        });
        return user;
    }
    // Connexion
    static async login(email: string, password: string) {
        const user = await db.user.findUnique({ where: { email } });
        if (!user) throw new Error("Utilisateur non trouvé");

        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid) throw new Error("Mot de passe incorrect");

        // Génération du token
        const tokens = await this.generateTokens(user.id);

        return { user, tokens };
    }

    // 


    // Reset password 
    static async resetPassword(token: string, newPassword: string) {
        const user = await db.user.findFirst({
            where: {
                resetPasswordToken: token,
                resetPasswordExpiresAt: {
                    gte: new Date(Date.now())
                }
            }
        }
        )
        if (!user) throw new Error("Token invalide");
        const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
        await db.user.update({
            where: { id: user.id },
            data: {
                passwordHash: hashedPassword,
                resetPasswordToken: null,
                resetPasswordExpiresAt: null
            }
        })
        return user;
    }
}
