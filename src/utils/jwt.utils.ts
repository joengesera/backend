// src/utils/jwt.utils.ts
import jwt, { JwtPayload, SignOptions, VerifyOptions } from 'jsonwebtoken';

export interface TokenPayload extends JwtPayload {
  userId: string;
  email: string;
  role?: string;
}

// ========== CONFIGURATION DEPUIS L'ENVIRONNEMENT ==========

// Récupération des variables d'environnement
const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET;
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
const ACCESS_TOKEN_EXPIRES_IN = process.env.JWT_EXPIRES|| '15m';
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

function getAccessTokenSecret(): string {
  const secret = ACCESS_TOKEN_SECRET;
  if (!secret) {
    throw new Error('JWT_ACCESS_SECRET environment variable is not set');
  }
  return secret;
}

function getRefreshTokenSecret(): string {
  const secret = REFRESH_TOKEN_SECRET;
  if (!secret) {
    throw new Error('JWT_REFRESH_SECRET environment variable is not set');
  }
  return secret;
}

// ========== TYPE GUARD ==========

function isTokenPayload(decoded: string | JwtPayload): decoded is TokenPayload {
  if (typeof decoded === 'string') {
    return false;
  }
  
  const payload = decoded as any;
  return (
    typeof payload === 'object' &&
    payload !== null &&
    typeof payload.userId === 'string' &&
    typeof payload.email === 'string'
    // role est optionnel, pas besoin de vérifier
  );
}

// ========== CLASSE JWTService ==========

export class JWTService {
  // Générer un token d'accès
  static generateAccessToken(payload: TokenPayload, options?: SignOptions): string {
    const secret = getAccessTokenSecret();
    return jwt.sign(payload, secret, {
      expiresIn: ACCESS_TOKEN_EXPIRES_IN as any,
      ...options
    });
  }

  // Générer un refresh token
  static generateRefreshToken(payload: TokenPayload, options?: SignOptions): string {
    const secret = getRefreshTokenSecret();
    return jwt.sign(payload, secret, {
      expiresIn: REFRESH_TOKEN_EXPIRES_IN as any,
      ...options
    });
  }

  // Vérifier un token d'accès
  static verifyAccessToken(token: string, options?: VerifyOptions): TokenPayload {
    const secret = getAccessTokenSecret();
    const decoded = jwt.verify(token, secret, options);
    
    if (!isTokenPayload(decoded)) {
      throw new Error('Invalid access token payload');
    }
    
    return decoded;
  }

  // Vérifier un refresh token
  static verifyRefreshToken(token: string, options?: VerifyOptions): TokenPayload {
    const secret = getRefreshTokenSecret();
    const decoded = jwt.verify(token, secret, options);
    
    if (!isTokenPayload(decoded)) {
      throw new Error('Invalid refresh token payload');
    }
    
    return decoded;
  }

  // Décoder un token sans vérification
  static decodeToken(token: string): TokenPayload | null {
    try {
      const decoded = jwt.decode(token);
      
      if (decoded && isTokenPayload(decoded)) {
        return decoded;
      }
      return null;
    } catch {
      return null;
    }
  }

  // ========== MÉTHODES UTILITAIRES ==========

  static extractUserId(token: string): string | null {
    const payload = this.decodeToken(token);
    return payload?.userId ?? null;
  }

  static createTokenPair(user: { userId: string; email: string; role?: string }): {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  } {
    const payload: TokenPayload = {
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
  private static parseExpiresIn(expiresIn: string): number {
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
  static isTokenExpired(token: string): boolean {
    try {
      this.verifyAccessToken(token);
      return false;
    } catch (error: any) {
      return error.message.includes('expired') || error.name === 'TokenExpiredError';
    }
  }

  // Obtenir la date d'expiration
  static getTokenExpiry(token: string): Date | null {
    const payload = this.decodeToken(token);
    if (payload?.exp) {
      return new Date(payload.exp * 1000);
    }
    return null;
  }
}

// ========== EXPORT DES FONCTIONS INDIVIDUELLES (compatibilité) ==========

export function generateToken(payload: TokenPayload, options?: SignOptions): string {
  return JWTService.generateAccessToken(payload, options);
}

export function generateRefreshToken(payload: TokenPayload, options?: SignOptions): string {
  return JWTService.generateRefreshToken(payload, options);
}

export function verifyToken(token: string, options?: VerifyOptions): TokenPayload {
  return JWTService.verifyAccessToken(token, options);
}

export function decodeToken(token: string): TokenPayload | null {
  return JWTService.decodeToken(token);
}

export function extractUserIdFromToken(token: string): string | null {
  return JWTService.extractUserId(token);
}