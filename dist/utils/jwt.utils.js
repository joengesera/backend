"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JWTService = void 0;
exports.generateToken = generateToken;
exports.generateRefreshToken = generateRefreshToken;
exports.verifyToken = verifyToken;
exports.decodeToken = decodeToken;
exports.extractUserIdFromToken = extractUserIdFromToken;
// src/utils/jwt.utils.ts
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// ========== CONFIGURATION DEPUIS L'ENVIRONNEMENT ==========
// Récupération des variables d'environnement
const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET;
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
const ACCESS_TOKEN_EXPIRES_IN = process.env.JWT_EXPIRES || '15m';
const REFRESH_TOKEN_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRE || '7d';
// Validation des secrets au démarrage (facultatif mais recommandé)
if (!ACCESS_TOKEN_SECRET) {
    console.error('❌ ERREUR: JWT_ACCESS_SECRET non défini dans les variables d\'environnement');
    // Ne pas throw en développement pour pouvoir tester
    if (process.env.NODE_ENV === 'production') {
        throw new Error('JWT_ACCESS_SECRET must be defined in environment variables');
    }
}
if (!REFRESH_TOKEN_SECRET) {
    console.error('⚠️ AVERTISSEMENT: JWT_REFRESH_SECRET non défini, utilisation de JWT_SECRET ou secret par défaut');
}
// ========== FONCTIONS DE VALIDATION ==========
function getAccessTokenSecret() {
    const secret = ACCESS_TOKEN_SECRET;
    if (!secret) {
        throw new Error('JWT_ACCESS_SECRET environment variable is not set');
    }
    return secret;
}
function getRefreshTokenSecret() {
    const secret = REFRESH_TOKEN_SECRET;
    if (!secret) {
        throw new Error('JWT_REFRESH_SECRET environment variable is not set');
    }
    return secret;
}
// ========== TYPE GUARD ==========
function isTokenPayload(decoded) {
    if (typeof decoded === 'string') {
        return false;
    }
    const payload = decoded;
    return (typeof payload === 'object' &&
        payload !== null &&
        typeof payload.userId === 'string' &&
        typeof payload.email === 'string'
    // role est optionnel, pas besoin de vérifier
    );
}
// ========== CLASSE JWTService ==========
class JWTService {
    // Générer un token d'accès
    static generateAccessToken(payload, options) {
        const secret = getAccessTokenSecret();
        return jsonwebtoken_1.default.sign(payload, secret, {
            expiresIn: ACCESS_TOKEN_EXPIRES_IN,
            ...options
        });
    }
    // Générer un refresh token
    static generateRefreshToken(payload, options) {
        const secret = getRefreshTokenSecret();
        return jsonwebtoken_1.default.sign(payload, secret, {
            expiresIn: REFRESH_TOKEN_EXPIRES_IN,
            ...options
        });
    }
    // Vérifier un token d'accès
    static verifyAccessToken(token, options) {
        const secret = getAccessTokenSecret();
        const decoded = jsonwebtoken_1.default.verify(token, secret, options);
        if (!isTokenPayload(decoded)) {
            throw new Error('Invalid access token payload');
        }
        return decoded;
    }
    // Vérifier un refresh token
    static verifyRefreshToken(token, options) {
        const secret = getRefreshTokenSecret();
        const decoded = jsonwebtoken_1.default.verify(token, secret, options);
        if (!isTokenPayload(decoded)) {
            throw new Error('Invalid refresh token payload');
        }
        return decoded;
    }
    // Décoder un token sans vérification
    static decodeToken(token) {
        try {
            const decoded = jsonwebtoken_1.default.decode(token);
            if (decoded && isTokenPayload(decoded)) {
                return decoded;
            }
            return null;
        }
        catch {
            return null;
        }
    }
    // ========== MÉTHODES UTILITAIRES ==========
    static extractUserId(token) {
        const payload = this.decodeToken(token);
        return payload?.userId ?? null;
    }
    static createTokenPair(user) {
        const payload = {
            userId: user.userId,
            email: user.email,
            role: user.role,
            iat: Math.floor(Date.now() / 1000)
        };
        const accessToken = this.generateAccessToken(payload);
        const refreshToken = this.generateRefreshToken(payload);
        // Convertir la durée en secondes (ex: '15m' → 900 secondes)
        const expiresIn = this.parseExpiresIn(ACCESS_TOKEN_EXPIRES_IN);
        return {
            accessToken,
            refreshToken,
            expiresIn
        };
    }
    // Convertir une chaîne comme '15m', '2h', '7d' en secondes
    static parseExpiresIn(expiresIn) {
        const match = expiresIn.match(/^(\d+)([smhd])$/);
        if (!match) {
            return 900; // 15 minutes par défaut
        }
        const value = parseInt(match[1]);
        const unit = match[2];
        switch (unit) {
            case 's': return value; // secondes
            case 'm': return value * 60; // minutes
            case 'h': return value * 60 * 60; // heures
            case 'd': return value * 24 * 60 * 60; // jours
            default: return 900;
        }
    }
    // Vérifier si un token est expiré
    static isTokenExpired(token) {
        try {
            this.verifyAccessToken(token);
            return false;
        }
        catch (error) {
            return error.message.includes('expired') || error.name === 'TokenExpiredError';
        }
    }
    // Obtenir la date d'expiration
    static getTokenExpiry(token) {
        const payload = this.decodeToken(token);
        if (payload?.exp) {
            return new Date(payload.exp * 1000);
        }
        return null;
    }
}
exports.JWTService = JWTService;
// ========== EXPORT DES FONCTIONS INDIVIDUELLES (compatibilité) ==========
function generateToken(payload, options) {
    return JWTService.generateAccessToken(payload, options);
}
function generateRefreshToken(payload, options) {
    return JWTService.generateRefreshToken(payload, options);
}
function verifyToken(token, options) {
    return JWTService.verifyAccessToken(token, options);
}
function decodeToken(token) {
    return JWTService.decodeToken(token);
}
function extractUserIdFromToken(token) {
    return JWTService.extractUserId(token);
}
