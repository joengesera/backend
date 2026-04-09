import { Router } from 'express';
import { register, login, ResetPassword, forgotPassword, logout, RefreshToken } from '../controllers/AuthController';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  logoutSchema,
  forgotPasswordSchema,
  resetPasswordSchema
} from '../validators/auth.validators';
import { validate } from '../middlewares/validate.middleware';

const router = Router();

router.post('/register', validate({ body: registerSchema }), register);
router.post('/login', validate({ body: loginSchema }), login);
router.post('/refresh-token', validate({ body: refreshTokenSchema }), RefreshToken);
router.post('/logout', validate({ body: logoutSchema }), logout);
router.post('/forgot-password', validate({ body: forgotPasswordSchema }), forgotPassword);
router.post('/reset-password', validate({ body: resetPasswordSchema }), ResetPassword);

export default router;
