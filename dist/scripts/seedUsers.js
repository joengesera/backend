"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const AuthServices_1 = require("../services/AuthServices");
const db_1 = require("../lib/db");
async function main() {
    const users = [
        { email: "test1@example.com", name: "Test User 1", password: "password123" },
        { email: "test2@example.com", name: "Test User 2", password: "password123" }
    ];
    console.log("Seeding test users...");
    for (const u of users) {
        try {
            const existing = await db_1.db.user.findUnique({ where: { email: u.email } });
            if (existing) {
                console.log(`User ${u.email} already exists.`);
            }
            else {
                await AuthServices_1.AuthService.register(u.email, u.name, u.password);
                console.log(`Created user: ${u.email}`);
            }
        }
        catch (error) {
            console.error(`Error creating user ${u.email}:`, error.message);
        }
    }
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await db_1.db.$disconnect();
});
