"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PasswordService = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
class PasswordService {
    static async hash(password) {
        return await bcrypt_1.default.hash(password, this.SALT_ROUNDS);
    }
    static async compare(password, hash) {
        return await bcrypt_1.default.compare(password, hash);
    }
    static validateStrength(password) {
        const errors = [];
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
        return {
            isValid: errors.length === 0,
            errors
        };
    }
}
exports.PasswordService = PasswordService;
PasswordService.SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12');
