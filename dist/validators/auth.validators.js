"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPasswordSchema = exports.refreshTokenSchema = exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
exports.registerSchema = zod_1.z.object({
    email: zod_1.z.string()
        .email('Email invalide')
        .min(5, 'Email trop court')
        .max(255, 'Email trop long'),
    password: zod_1.z.string()
        .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
        .regex(/[A-Z]/, 'Doit contenir une majuscule')
        .regex(/[a-z]/, 'Doit contenir une minuscule')
        .regex(/[0-9]/, 'Doit contenir un chiffre')
        .regex(/[^A-Za-z0-9]/, 'Doit contenir un caractère spécial'),
});
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string()
        .email('invalid mail'),
    password: zod_1.z.string()
        .min(1, 'invalid mail')
});
exports.refreshTokenSchema = zod_1.z.object({
    refreshToken: zod_1.z.string()
        .min(1, 'Le refresh token est requis'),
});
exports.resetPasswordSchema = zod_1.z.object({
    token: zod_1.z.string()
        .min(1, 'Le token est requis'),
    newPassword: zod_1.z.string()
        .min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
});
