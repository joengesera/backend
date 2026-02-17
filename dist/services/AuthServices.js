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
function getJwtSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET must be defined');
    }
    return secret;
}
function getRefreshJwtSecret() {
    const secret = process.env.JWT_REFRESH_SECRET;
    if (!secret) {
        throw new Error('JWT_REFRESH_SECRET must be defined');
    }
    return secret;
}
function hashResetToken(token) {
    return crypto_1.default.createHash('sha256').update(token).digest('hex');
}
class AuthService {
    static async generateTokens(userId) {
        const accessToken = jsonwebtoken_1.default.sign({ userId }, getJwtSecret(), { expiresIn: '15m' });
        const refreshToken = jsonwebtoken_1.default.sign({ userId }, getRefreshJwtSecret(), { expiresIn: '10d' });
        await db_1.db.refreshToken.create({
            data: {
                token: refreshToken,
                userId,
                expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)
            }
        });
        return { accessToken, refreshToken };
    }
    static async refreshToken(refreshToken) {
        const payload = jsonwebtoken_1.default.verify(refreshToken, getRefreshJwtSecret());
        if (!payload.userId || typeof payload.userId !== 'string') {
            throw new Error('Token invalide');
        }
        const dbToken = await db_1.db.refreshToken.findUnique({
            where: { token: refreshToken }
        });
        if (!dbToken || dbToken.expiresAt < new Date()) {
            throw new Error('Token invalide');
        }
        const tokens = await this.generateTokens(payload.userId);
        await db_1.db.refreshToken.delete({ where: { token: refreshToken } });
        return tokens;
    }
    static async logout(refreshToken) {
        await db_1.db.refreshToken.delete({ where: { token: refreshToken } });
    }
    static async forgotPassword(email) {
        const user = await db_1.db.user.findUnique({ where: { email } });
        if (!user) {
            throw new Error('Utilisateur non trouv�');
        }
        const resetToken = crypto_1.default.randomBytes(32).toString('hex');
        const hashedResetToken = hashResetToken(resetToken);
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
        await db_1.db.user.update({
            where: { id: user.id },
            data: {
                resetPasswordToken: hashedResetToken,
                resetPasswordExpiresAt: expiresAt
            }
        });
        await emailService_1.EmailService.sendResetPasswordEmail(email, resetToken);
    }
    static async register(email, name, password) {
        const hashedPassword = await bcrypt_1.default.hash(password, SALT_ROUNDS);
        const user = await db_1.db.user.create({
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
    static async login(email, password) {
        const user = await db_1.db.user.findUnique({ where: { email } });
        if (!user) {
            throw new Error('Utilisateur non trouv�');
        }
        const isPasswordValid = await bcrypt_1.default.compare(password, user.passwordHash);
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
    static async resetPassword(token, newPassword) {
        const hashedToken = hashResetToken(token);
        const user = await db_1.db.user.findFirst({
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
        const hashedPassword = await bcrypt_1.default.hash(newPassword, SALT_ROUNDS);
        await db_1.db.user.update({
            where: { id: user.id },
            data: {
                passwordHash: hashedPassword,
                resetPasswordToken: null,
                resetPasswordExpiresAt: null
            }
        });
    }
}
exports.AuthService = AuthService;
