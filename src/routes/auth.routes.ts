import { Router, Request, Response } from 'express';
import { register, login, ResetPassword, forgotPassword, logout, RefreshToken } from '../controllers/AuthController';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema
} from '../validators/auth.validators';

const router = Router();

router.post('/register', async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  await register(req, res);
});

router.post('/login', async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  await login(req, res);
});

router.post('/refresh-token', async (req: Request, res: Response) => {
  const parsed = refreshTokenSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  await RefreshToken(req, res);
});

router.post('/logout', async (req: Request, res: Response) => {
  await logout(req, res);
});

router.post('/forgot-password', async (req: Request, res: Response) => {
  const parsed = forgotPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  await forgotPassword(req, res);
});

router.post('/reset-password', async (req: Request, res: Response) => {
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  await ResetPassword(req, res);
});

export default router;
