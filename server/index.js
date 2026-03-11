import { createApp } from "./app.js";
import { config } from "./config.js";
import { initDatabase } from "./db/initDatabase.js";

function getStartupHint(error) {
  if (error.code === "ER_ACCESS_DENIED_ERROR") {
    return "MySQL login failed. Update DB_USER and DB_PASSWORD in your .env file.";
  }

  if (error.code === "ECONNREFUSED") {
    return "MySQL is not reachable. Start the MySQL server and verify DB_HOST and DB_PORT.";
  }

  return error.message;
}

async function startServer() {
  await initDatabase();

  const app = createApp();
  app.listen(config.port, () => {
    console.log(`EventPulse API listening on http://127.0.0.1:${config.port}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start EventPulse API.");
  console.error(getStartupHint(error));
  console.error(error);
  process.exit(1);
});
