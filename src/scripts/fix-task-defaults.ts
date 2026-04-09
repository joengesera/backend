import { db } from "../lib/db";
import { ensureTaskDefaults } from "../services/TaskSyncService";

async function main() {
  console.log("Starting task defaults migration...");
  
  const users = await db.user.findMany({ select: { id: true } });
  
  for (const user of users) {
    console.log(`Processing user ${user.id}...`);
    const result = await ensureTaskDefaults(user.id);
    console.log(`Updated ${result.updated} tasks for user ${user.id}`);
  }
  
  console.log("Migration complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
