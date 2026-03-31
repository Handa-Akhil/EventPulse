import { createApp } from "./server/app.js";
import { config } from "./server/config.js";
import { sequelize } from "./server/models/index.js";
import { initDatabase } from "./server/db/initDatabase.js";

async function run() {
  try {
    console.log("Authenticating Sequelize...");
    await sequelize.authenticate();
    console.log("Initializing database...");
    await initDatabase();
    console.log("Database initialized successfully!");
  } catch (err) {
    console.error("CRITICAL ERROR during startup:");
    console.error(err);
    process.exit(1);
  }
}

run();
