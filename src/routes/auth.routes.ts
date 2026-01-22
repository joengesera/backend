// src/routes/auth.routes.ts
import { Router } from 'express';
import { Request, Response } from 'express';
import { register, login, ResetPassword, forgotPassword, logout, RefreshToken } from '../controllers/AuthController';


const router = Router();

// Inscription : POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    await register(req, res);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
    console.log(error);
  }
});

// Connexion : POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    await login(req, res);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Refresh Token: POST /api/auth/refresh-token
router.post('/refresh-token', async (req: Request, res: Response) => {
  await RefreshToken(req, res);
});

// Logout: POST /api/auth/logout
router.post('/logout', async (req: Request, res: Response) => {
  try {
    logout(req, res);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Demande de reinitialisation
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    forgotPassword(req, res);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Reset Password: POST /api/auth/reset-password
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    ResetPassword(req, res);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
