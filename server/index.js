import http from "http";
import { Server } from "socket.io";

import { createApp } from "./app.js";
import { config } from "./config.js";
import { initDatabase } from "./db/initDatabase.js";
import { sequelize } from "./models/index.js";

let io;

export { io };

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
  await sequelize.authenticate();
  await initDatabase();

  const app = createApp();
  const server = http.createServer(app);

  io = new Server(server, {
    cors: {
      origin: config.clientOrigin,
    },
  });

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);
  });

  server.listen(config.port, () => {
    console.log(`EventPulse API listening on http://127.0.0.1:${config.port}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start EventPulse API.");
  console.error(getStartupHint(error));
  console.error(error);
  process.exit(1);
});
