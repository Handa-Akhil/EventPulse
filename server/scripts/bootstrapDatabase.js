import { initDatabase } from "../db/initDatabase.js";
import { closePool, pingDatabase } from "../db/pool.js";

async function main() {
  const dbInfo = await pingDatabase();
  await initDatabase();
  console.log(`Database bootstrap complete (${dbInfo.version}).`);
}

main()
  .catch((error) => {
    console.error("Database bootstrap failed.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
