import { closePool, pingDatabase } from "./server/db/pool.js";

async function main() {
  try {
    const result = await pingDatabase();
    console.log(`Connected to TiDB successfully (${result.version}).`);
  } finally {
    await closePool();
  }
}

main().catch((error) => {
  console.error("Database connection failed.");
  console.error(error.message);
  process.exit(1);
});
