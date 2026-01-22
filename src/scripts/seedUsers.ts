
import { AuthService } from "../services/AuthServices";
import { db } from "../lib/db";

async function main() {
    const users = [
        { email: "test1@example.com", name: "Test User 1", password: "password123" },
        { email: "test2@example.com", name: "Test User 2", password: "password123" }
    ];

    console.log("Seeding test users...");

    for (const u of users) {
        try {
            const existing = await db.user.findUnique({ where: { email: u.email } });
            if (existing) {
                console.log(`User ${u.email} already exists.`);
            } else {
                await AuthService.register(u.email, u.name, u.password);
                console.log(`Created user: ${u.email}`);
            }
        } catch (error: any) {
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
        await db.$disconnect();
    });
