import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

router.get('/auth-test', authenticateToken, (req, res) => {
    const user = (req as any).user;
    res.json({
        success: true,
        message: 'Authentication successful',
        userId: user?.userId,
        tokenPayload: user
    });
});

export default router;
