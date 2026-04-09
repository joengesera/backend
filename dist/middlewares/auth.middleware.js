"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const apiResponse_1 = require("../utils/apiResponse");
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    if (!token)
        return (0, apiResponse_1.sendError)(res, 'Access token requis.', 401, 'MISSING_ACCESS_TOKEN');
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        console.error('JWT_SECRET is not defined');
        return (0, apiResponse_1.sendError)(res, 'Configuration serveur invalide.', 500, 'SERVER_CONFIG_ERROR');
    }
    jsonwebtoken_1.default.verify(token, secret, (err, user) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                return (0, apiResponse_1.sendError)(res, 'Token expire.', 401, 'TOKEN_EXPIRED');
            }
            return (0, apiResponse_1.sendError)(res, 'Token invalide.', 401, 'INVALID_TOKEN');
        }
        req.user = user;
        next();
    });
};
exports.authenticateToken = authenticateToken;
