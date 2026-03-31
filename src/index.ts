import dotenv from "dotenv";
dotenv.config(); // ← DOIT être en premier, avant tout autre import qui utilise process.env

import app from "./app";

const PORT = process.env.PORT || 3000;
const dbHost = process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] ?? 'NON DÉFINI';

app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
    console.log(`🗄️  DB host: ${dbHost}`);
});
