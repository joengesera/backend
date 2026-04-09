import nodemailer from 'nodemailer';

const frontendBaseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

export class EmailService {
  private static transporter = nodemailer.createTransport({
    host: process.env.MAILTRAP_HOST,
    port: 2525,
    secure: false,
    auth: {
      user: process.env.MAILTRAP_USER,
      pass: process.env.MAILTRAP_PASS
    }
  });

  static async sendResetPasswordEmail(email: string, token: string) {
    const resetLink = `${frontendBaseUrl.replace(/\/$/, '')}/reset-password?token=${token}`;

    const mailOptions = {
      from: 'StudyFlow <no-reply@studyflow.local>',
      to: email,
      subject: 'Mot de passe oublie',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; border-radius: 10px;">
          <h2 style="color: #3B82F6; text-align: center;">StudyFlow</h2>
          <p>Bonjour,</p>
          <p>Vous avez demande la reinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe :</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #3B82F6; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Reinitialiser mon mot de passe</a>
          </div>
          <p>Ce lien est valable pendant 1 heure. Si vous n'etes pas a l'origine de cette demande, ignorez cet email.</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #888; text-align: center;">StudyFlow</p>
        </div>
      `
    };

    return this.transporter.sendMail(mailOptions);
  }
}
