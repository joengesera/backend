import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
    const jwtSecret = process.env.JWT_SECRET as string;
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    // ENABLE debug logging temporarily
    console.log('=== AUTH MIDDLEWARE DEBUG ===');
    console.log('Request URL:', req.method, req.path);
    console.log('Authorization header:', authHeader ? 'Present' : 'MISSING');
    console.log('Extracted token:', token ? `${token.substring(0, 20)}...` : 'MISSING');
    console.log('JWT_SECRET available:', !!process.env.JWT_SECRET);

    if (!token) {
        console.log('❌ No token provided');
        return res.status(401).json({ message: 'Token manquant' });
    }

    jwt.verify(token, jwtSecret, (err: any, user: any) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json(
                    {
                        message: 'Le token a expiré',
                        code: err.code,
                        expiredAt: err.expiredAt
                    }
                )
            }
            console.error('❌ JWT Verify Error:', err.message);
            console.error('Error name:', err.name);
            console.error('Error details:', err);
            return res.status(40).json({
                message: 'Token invalide',
                error: err.message,
                errorType: err.name
            });
        }

        console.log('✅ Token verified successfully for user:', user.userId);
        (req as any).user = user;
        next();
    });
}