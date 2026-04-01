import http from "http";
import { Server } from "socket.io";

import { createApp } from "./app.js";
import { config } from "./config.js";
import { initDatabase } from "./db/initDatabase.js";
import { sequelize } from "./models/index.js";

let io;
const userSockets = new Map(); // userId -> Set<socketId>

export { io, userSockets };

export function emitToUser(userId, event, data) {
  const sockets = userSockets.get(userId);
  if (sockets && io) {
    for (const socketId of sockets) {
      io.to(socketId).emit(event, data);
    }
  }
}

export function emitToEventRoom(eventId, event, data) {
  if (io) {
    io.to(`event:${eventId}`).emit(event, data);
  }
}

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

    // Register user for targeted notifications
    socket.on("register", (userId) => {
      if (!userId) return;
      if (!userSockets.has(userId)) {
        userSockets.set(userId, new Set());
      }
      userSockets.get(userId).add(socket.id);
      socket.userId = userId;
    });

    // Join event room for live updates
    socket.on("join-event", (eventId) => {
      if (!eventId) return;
      socket.join(`event:${eventId}`);
      // Emit current viewer count
      const room = io.sockets.adapter.rooms.get(`event:${eventId}`);
      const viewerCount = room ? room.size : 0;
      io.to(`event:${eventId}`).emit("viewer-count", { eventId, viewerCount });
    });

    // Leave event room
    socket.on("leave-event", (eventId) => {
      if (!eventId) return;
      socket.leave(`event:${eventId}`);
      const room = io.sockets.adapter.rooms.get(`event:${eventId}`);
      const viewerCount = room ? room.size : 0;
      io.to(`event:${eventId}`).emit("viewer-count", { eventId, viewerCount });
    });

    socket.on("disconnect", () => {
      // Clean up user socket mapping
      if (socket.userId && userSockets.has(socket.userId)) {
        userSockets.get(socket.userId).delete(socket.id);
        if (userSockets.get(socket.userId).size === 0) {
          userSockets.delete(socket.userId);
        }
      }
    });
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
