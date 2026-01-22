import bcrypt from 'bcrypt';

export class PasswordService {
    private static readonly SALT_ROUNDS= parseInt (
        process.env.BCRYPT_SALT_ROUNDS || '12'
    );

    static async hash (password: string): Promise<string>{
        return await bcrypt.hash(password, this.SALT_ROUNDS);
    }

    static async compare(
        password: string,
        hash: string
    ): Promise<boolean>{
        return await bcrypt.compare(password, hash);
    }

    static validateStrength(password: string):{
        isValid:boolean;
        errors: string[];
    }{
        const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('Le mot de passe doit contenir au moins 8 caractères');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Le mot de passe doit contenir une majuscule');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Le mot de passe doit contenir une minuscule');
    }
    
    if (!/[0-9]/.test(password)) {
      errors.push('Le mot de passe doit contenir un chiffre');
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Le mot de passe doit contenir un caractère spécial');
    }
    return{
        isValid: errors.length ===0,
        errors
    };
    }
}