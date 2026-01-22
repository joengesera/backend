import { register } from 'module'
import {email, z} from 'zod'

export const registerSchema = z.object({

    email: z.string()
    .email('Email invalide')
    .min(5, 'Email trop court')
    .max(255, 'Email trop long'),
  
    password: z.string()
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
    .regex(/[A-Z]/, 'Doit contenir une majuscule')
    .regex(/[a-z]/, 'Doit contenir une minuscule')
    .regex(/[0-9]/, 'Doit contenir un chiffre')
    .regex(/[^A-Za-z0-9]/, 'Doit contenir un caractère spécial'),
   
    
})

export const loginSchema = z.object({
    email: z.string()
        .email('invalid mail'),

    password: z.string()
        .min(1,'invalid mail')
})

export const refreshTokenSchema = z.object({
  refreshToken: z.string()
    .min(1, 'Le refresh token est requis'),
});

export const resetPasswordSchema = z.object({
  token: z.string()
    .min(1, 'Le token est requis'),
  
  newPassword: z.string()
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
});