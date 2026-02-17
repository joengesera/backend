"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPasswordSchema = exports.forgotPasswordSchema = exports.refreshTokenSchema = exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
exports.registerSchema = zod_1.z.object({
    email: zod_1.z.string().email('Email invalide').min(5).max(255),
    name: zod_1.z.string().min(2, 'Nom trop court').max(100, 'Nom trop long'),
    password: zod_1.z.string()
        .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
});
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Email invalide'),
    password: zod_1.z.string().min(1, 'Mot de passe requis')
});
exports.refreshTokenSchema = zod_1.z.object({
    refreshToken: zod_1.z.string().min(1, 'Le refresh token est requis'),
});
exports.forgotPasswordSchema = zod_1.z.object({
    email: zod_1.z.string().email('Email invalide')
});
exports.resetPasswordSchema = zod_1.z.object({
    token: zod_1.z.string().min(1, 'Le token est requis'),
    newPassword: zod_1.z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
});
