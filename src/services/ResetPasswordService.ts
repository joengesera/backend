import { db } from "../lib/db";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { EmailService } from "./emailService";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN;
const RESET_PASSWORD_EXPIRES_IN = process.env.RESET_PASSWORD_EXPIRES_IN;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const JWT_REFRESH_EXPIRE=process.env.JWT_REFRESH_EXPIRE;


export class ResetPasswordService {
    private static async VerifyEmail(email:string){
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            throw new Error("Email invalide");
        }
        const user = await db.user.findUnique({ where: { email } });
        if (!user) throw new Error("Utilisateur non trouvé");
        return user;
    }   
}
