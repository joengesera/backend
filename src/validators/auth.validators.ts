import { z } from 'zod';

export const registerSchema = z.object({
    email: z.string().email('Email invalide').min(5).max(255),
    name: z.string().min(2, 'Nom trop court').max(100, 'Nom trop long'),
    password: z.string()
        .min(8, 'Le mot de passe doit contenir au moins 8 caracteres')
        .regex(/[A-Z]/, 'Le mot de passe doit contenir au moins une majuscule')
        .regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre')
        .regex(/[^A-Za-z0-9]/, 'Le mot de passe doit contenir au moins un caractere special'),
    role: z.enum(['STUDENT', 'PROFESSOR']).optional().default('STUDENT'),
    deviceId: z.string().uuid('deviceId invalide').optional()
});

export const loginSchema = z.object({
    email: z.string().email('Email invalide'),
    password: z.string().min(1, 'Mot de passe requis'),
    deviceId: z.string().uuid('deviceId invalide').optional()
});

export const refreshTokenSchema = z.object({
    refreshToken: z.string().min(1, 'Le refresh token est requis'),
    deviceId: z.string().uuid('deviceId invalide').optional()
});

export const logoutSchema = z.object({
    refreshToken: z.string().min(1).optional(),
    deviceId: z.string().uuid('deviceId invalide').optional()
});

export const forgotPasswordSchema = z.object({
    email: z.string().email('Email invalide')
});

export const resetPasswordSchema = z.object({
    token: z.string().min(1, 'Le token est requis'),
    newPassword: z.string()
        .min(8, 'Le mot de passe doit contenir au moins 8 caracteres')
        .regex(/[A-Z]/, 'Le mot de passe doit contenir au moins une majuscule')
        .regex(/[0-9]/, 'Le mot de passe doit contenir au least un chiffre')
        .regex(/[^A-Za-z0-9]/, 'Le mot de passe doit contenir au moins un caractere special')
});
