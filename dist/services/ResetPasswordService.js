"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResetPasswordService = void 0;
const db_1 = require("../lib/db");
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN;
const RESET_PASSWORD_EXPIRES_IN = process.env.RESET_PASSWORD_EXPIRES_IN;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const JWT_REFRESH_EXPIRE = process.env.JWT_REFRESH_EXPIRE;
class ResetPasswordService {
    static async VerifyEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            throw new Error("Email invalide");
        }
        const user = await db_1.db.user.findUnique({ where: { email } });
        if (!user)
            throw new Error("Utilisateur non trouvé");
        return user;
    }
}
exports.ResetPasswordService = ResetPasswordService;
