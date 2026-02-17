"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
class EmailService {
    static async sendResetPasswordEmail(email, token) {
        const resetLink = `http://localhost:3000/reset-password?token=${token}`;
        const mailOptions = {
            from: '""',
            to: email,
            subject: 'Mot de passe oublié',
            html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; border-radius: 10px;">
          <h2 style="color: #3B82F6; text-align: center;">StudyFlow</h2>
          <p>Bonjour,</p>
          <p>Vous avez demandé la réinitialisation de votre mot de passe pour votre compte StudyFlow. Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe :</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #3B82F6; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Réinitialiser mon mot de passe</a>
          </div>
          <p>Ce lien est valable pendant 1 heure. Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email.</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #888; text-align: center;">© 2024 StudyFlow - L'organisation académique simplifiée.</p>
            </div>
            `
        };
        return await this.transporter.sendMail(mailOptions);
    }
}
exports.EmailService = EmailService;
EmailService.transporter = nodemailer_1.default.createTransport({
    host: process.env.MAILTRAP_HOST,
    port: 2525,
    secure: false,
    auth: {
        user: process.env.MAILTRAP_USER,
        pass: process.env.MAILTRAP_PASS
    }
});
