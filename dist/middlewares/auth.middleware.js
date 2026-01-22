"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const authenticateToken = (req, res, next) => {
    const jwtSecret = process.env.JWT_SECRET;
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
    jsonwebtoken_1.default.verify(token, jwtSecret, (err, user) => {
        if (err) {
            console.error('❌ JWT Verify Error:', err.message);
            console.error('Error name:', err.name);
            console.error('Error details:', err);
            return res.status(403).json({
                message: 'Token invalide',
                error: err.message,
                errorType: err.name
            });
        }
        console.log('✅ Token verified successfully for user:', user.userId);
        req.user = user;
        next();
    });
};
exports.authenticateToken = authenticateToken;
