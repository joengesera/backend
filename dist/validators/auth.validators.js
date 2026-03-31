"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPasswordSchema = exports.forgotPasswordSchema = exports.logoutSchema = exports.refreshTokenSchema = exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
exports.registerSchema = zod_1.z.object({
    email: zod_1.z.string().email('Email invalide').min(5).max(255),
    name: zod_1.z.string().min(2, 'Nom trop court').max(100, 'Nom trop long'),
    password: zod_1.z.string()
        .min(8, 'Le mot de passe doit contenir au moins 8 caracteres')
        .regex(/[A-Z]/, 'Le mot de passe doit contenir au moins une majuscule')
        .regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre')
        .regex(/[^A-Za-z0-9]/, 'Le mot de passe doit contenir au moins un caractere special'),
    role: zod_1.z.enum(['STUDENT', 'PROFESSOR']).optional().default('STUDENT'),
    deviceId: zod_1.z.string().uuid('deviceId invalide').optional()
});
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Email invalide'),
    password: zod_1.z.string().min(1, 'Mot de passe requis'),
    deviceId: zod_1.z.string().uuid('deviceId invalide').optional()
});
exports.refreshTokenSchema = zod_1.z.object({
    refreshToken: zod_1.z.string().min(1, 'Le refresh token est requis'),
    deviceId: zod_1.z.string().uuid('deviceId invalide').optional()
});
exports.logoutSchema = zod_1.z.object({
    refreshToken: zod_1.z.string().min(1).optional(),
    deviceId: zod_1.z.string().uuid('deviceId invalide').optional()
});
exports.forgotPasswordSchema = zod_1.z.object({
    email: zod_1.z.string().email('Email invalide')
});
exports.resetPasswordSchema = zod_1.z.object({
    token: zod_1.z.string().min(1, 'Le token est requis'),
    newPassword: zod_1.z.string()
        .min(8, 'Le mot de passe doit contenir au moins 8 caracteres')
        .regex(/[A-Z]/, 'Le mot de passe doit contenir au moins une majuscule')
        .regex(/[0-9]/, 'Le mot de passe doit contenir au least un chiffre')
        .regex(/[^A-Za-z0-9]/, 'Le mot de passe doit contenir au moins un caractere special')
});
