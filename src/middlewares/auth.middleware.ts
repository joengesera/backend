import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        return res.status(500).json({ message: 'JWT_SECRET non configuré' });
    }

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Token manquant' });
    }

    jwt.verify(token, jwtSecret, (err: any, user: any) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Le token a expiré' });
            }

            return res.status(401).json({ message: 'Token invalide' });
        }

        (req as any).user = user;
        next();
    });
};
