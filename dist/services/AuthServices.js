"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = require("../lib/db");
const crypto_1 = __importDefault(require("crypto"));
const emailService_1 = require("./emailService");
const SALT_ROUNDS = 10;
const JWT_SECRET = String(process.env.JWT_SECRET);
const JWT_REFRESH_SECRET = String(process.env.JWT_REFRESH_SECRET);
if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
    throw new Error("JWT_SECRET or JWT_REFRESH_SECRET must be defined");
}
class AuthService {
    // Génération des tokens
    static async generateTokens(userId) {
        const accessToken = jsonwebtoken_1.default.sign({ userId }, JWT_SECRET, { expiresIn: '15m' });
        const refreshToken = jsonwebtoken_1.default.sign({ userId }, JWT_REFRESH_SECRET, { expiresIn: '10d' });
        await db_1.db.refreshToken.create({
            data: {
                token: refreshToken,
                userId: userId,
                expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)
            }
        });
        return { accessToken, refreshToken };
    }
    // Logique de refresh
    static async refreshToken(refreshToken) {
        const payload = jsonwebtoken_1.default.verify(refreshToken, JWT_REFRESH_SECRET);
        const dbToken = await db_1.db.refreshToken.findUnique({ where: { token: refreshToken } });
        if (!dbToken || dbToken.expiresAt < new Date(Date.now())) {
            throw new Error("Token invalide");
        }
        // On genere un nouvel access token et un nouveau refresh token
        const tokens = await this.generateTokens(payload.userId);
        // On supprime le token refresh
        await db_1.db.refreshToken.delete({ where: { token: refreshToken } });
        return tokens;
    }
    // Logique de logout
    static async logout(refreshToken) {
        await db_1.db.refreshToken.delete({ where: { token: refreshToken } });
    }
    // Mot de passe oublie
    static async forgotPassword(email) {
        const user = await db_1.db.user.findUnique({ where: { email } });
        if (!user)
            throw new Error("Utilisateur non trouvé");
        const resetToken = crypto_1.default.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 600 * 1000); // 1 heure
        await db_1.db.user.update({
            where: { id: user.id },
            data: {
                resetPasswordToken: resetToken,
                resetPasswordExpiresAt: expiresAt
            }
        });
        await emailService_1.EmailService.sendResetPasswordEmail(email, resetToken);
        return { message: "Email de réinitialisation envoyé" };
    }
    // Inscription 
    static async register(email, name, password) {
        const hashedPassword = await bcrypt_1.default.hash(password, SALT_ROUNDS);
        const user = await db_1.db.user.create({
            data: {
                email,
                name,
                passwordHash: hashedPassword
            }
        });
        return user;
    }
    // Connexion
    static async login(email, password) {
        const user = await db_1.db.user.findUnique({ where: { email } });
        if (!user)
            throw new Error("Utilisateur non trouvé");
        const isPasswordValid = await bcrypt_1.default.compare(password, user.passwordHash);
        if (!isPasswordValid)
            throw new Error("Mot de passe incorrect");
        // Génération du token
        const tokens = await this.generateTokens(user.id);
        return { user, tokens };
    }
    // 
    // Reset password 
    static async resetPassword(token, newPassword) {
        const user = await db_1.db.user.findFirst({
            where: {
                resetPasswordToken: token,
                resetPasswordExpiresAt: {
                    gte: new Date(Date.now())
                }
            }
        });
        if (!user)
            throw new Error("Token invalide");
        const hashedPassword = await bcrypt_1.default.hash(newPassword, SALT_ROUNDS);
        await db_1.db.user.update({
            where: { id: user.id },
            data: {
                passwordHash: hashedPassword,
                resetPasswordToken: null,
                resetPasswordExpiresAt: null
            }
        });
        return user;
    }
}
exports.AuthService = AuthService;
