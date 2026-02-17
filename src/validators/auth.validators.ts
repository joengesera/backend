import { z } from 'zod';

export const registerSchema = z.object({
    email: z.string().email('Email invalide').min(5).max(255),
    name: z.string().min(2, 'Nom trop court').max(100, 'Nom trop long'),
    password: z.string()
        .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
});

export const loginSchema = z.object({
    email: z.string().email('Email invalide'),
    password: z.string().min(1, 'Mot de passe requis')
});

export const refreshTokenSchema = z.object({
    refreshToken: z.string().min(1, 'Le refresh token est requis'),
});

export const forgotPasswordSchema = z.object({
    email: z.string().email('Email invalide')
});

export const resetPasswordSchema = z.object({
    token: z.string().min(1, 'Le token est requis'),
    newPassword: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
});
