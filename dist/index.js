"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config(); // ← DOIT être en premier, avant tout autre import qui utilise process.env
const app_1 = __importDefault(require("./app"));
const PORT = process.env.PORT || 3000;
const dbHost = process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] ?? 'NON DÉFINI';
app_1.default.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
    console.log(`🗄️  DB host: ${dbHost}`);
});
