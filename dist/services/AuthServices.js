"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const db_1 = require("../lib/db");
const emailService_1 = require("./emailService");
const SALT_ROUNDS = 12; // CORRECTIF: 10 est le minimum viable, 12 est recommandé en 2024+
function getJwtSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret)
        throw new Error('JWT_SECRET must be defined');
    return secret;
}
function getRefreshJwtSecret() {
    const secret = process.env.JWT_REFRESH_SECRET;
    if (!secret)
        throw new Error('JWT_REFRESH_SECRET must be defined');
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
                expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
            },
        });
        return { accessToken, refreshToken };
    }
    static async refreshToken(refreshToken) {
        // CORRECTIF: vérifier en DB AVANT de vérifier la signature JWT
        // pour invalider immédiatement les tokens révoqués
        const dbToken = await db_1.db.refreshToken.findUnique({
            where: { token: refreshToken },
        });
        if (!dbToken || dbToken.expiresAt < new Date()) {
            throw new Error('Token invalide ou expiré');
        }
        let payload;
        try {
            payload = jsonwebtoken_1.default.verify(refreshToken, getRefreshJwtSecret());
        }
        catch {
            // Token DB présent mais signature invalide → révoquer par sécurité
            await db_1.db.refreshToken.delete({ where: { token: refreshToken } });
            throw new Error('Token invalide');
        }
        if (!payload.userId || typeof payload.userId !== 'string') {
            throw new Error('Token invalide');
        }
        // Rotation: supprimer l'ancien, créer le nouveau
        await db_1.db.refreshToken.delete({ where: { token: refreshToken } });
        return this.generateTokens(payload.userId);
    }
    static async logout(refreshToken) {
        // CORRECTIF: ne pas throw si le token n'existe pas (déjà révoqué = OK)
        await db_1.db.refreshToken.deleteMany({ where: { token: refreshToken } });
    }
    static async register(email, name, password, role = 'STUDENT') {
        const hashedPassword = await bcrypt_1.default.hash(password, SALT_ROUNDS);
        const user = await db_1.db.user.create({
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
            await db_1.db.professor.create({ data: { userId: user.id } });
        }
        return user;
    }
    static async login(email, password) {
        const user = await db_1.db.user.findUnique({ where: { email } });
        // CORRECTIF: comparer le hash même si l'utilisateur n'existe pas
        // pour éviter le timing attack (user enumeration via temps de réponse)
        const DUMMY_HASH = '$2b$12$invalidhashfortimingprotectiononly.........';
        const isValid = user
            ? await bcrypt_1.default.compare(password, user.passwordHash)
            : await bcrypt_1.default.compare(password, DUMMY_HASH).then(() => false);
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
    static async forgotPassword(email) {
        const user = await db_1.db.user.findUnique({ where: { email } });
        // CORRECTIF: ne plus throw si le user n'existe pas.
        // Le contrôleur renvoie toujours la même réponse → pas de user enumeration.
        if (!user)
            return;
        const resetToken = crypto_1.default.randomBytes(32).toString('hex');
        const hashedResetToken = hashResetToken(resetToken);
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
        await db_1.db.user.update({
            where: { id: user.id },
            data: { resetPasswordToken: hashedResetToken, resetPasswordExpiresAt: expiresAt },
        });
        await emailService_1.EmailService.sendResetPasswordEmail(email, resetToken);
    }
    static async resetPassword(token, newPassword) {
        const hashedToken = hashResetToken(token);
        const user = await db_1.db.user.findFirst({
            where: {
                resetPasswordToken: hashedToken,
                resetPasswordExpiresAt: { gte: new Date() },
            },
        });
        if (!user)
            throw new Error('Token invalide ou expiré');
        const hashedPassword = await bcrypt_1.default.hash(newPassword, SALT_ROUNDS);
        await db_1.db.user.update({
            where: { id: user.id },
            data: {
                passwordHash: hashedPassword,
                resetPasswordToken: null,
                resetPasswordExpiresAt: null,
            },
        });
        // CORRECTIF: invalider tous les refresh tokens de l'utilisateur
        // après un reset de mot de passe (bonne pratique sécurité)
        await db_1.db.refreshToken.deleteMany({ where: { userId: user.id } });
    }
}
exports.AuthService = AuthService;
