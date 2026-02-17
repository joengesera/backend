"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const authenticateToken = (req, res, next) => {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        return res.status(500).json({ message: 'JWT_SECRET non configur�' });
    }
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'Token manquant' });
    }
    jsonwebtoken_1.default.verify(token, jwtSecret, (err, user) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Le token a expir�' });
            }
            return res.status(401).json({ message: 'Token invalide' });
        }
        req.user = user;
        next();
    });
};
exports.authenticateToken = authenticateToken;
