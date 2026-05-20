import http from "node:http";
import { Server } from "socket.io";
import { createApp } from "./app.js";
import { config } from "./config.js";
import { initDatabase } from "./db/initDatabase.js";
import { closePool, pingDatabase } from "./db/pool.js";
import { extractBearerToken, resolveUserFromToken } from "./middleware/auth.js";

let io;
const userSockets = new Map();

export { io, userSockets };

export function emitToUser(userId, event, data) {
  const sockets = userSockets.get(userId);
  if (!sockets || !io) {
    return;
  }

  for (const socketId of sockets) {
    io.to(socketId).emit(event, data);
  }
}

export function emitToEventRoom(eventId, event, data) {
  if (io) {
    io.to(`event:${eventId}`).emit(event, data);
  }
}

function addUserSocket(userId, socketId) {
  if (!userSockets.has(userId)) {
    userSockets.set(userId, new Set());
  }

  userSockets.get(userId).add(socketId);
}

function removeUserSocket(userId, socketId) {
  const sockets = userSockets.get(userId);
  if (!sockets) {
    return;
  }

  sockets.delete(socketId);
  if (sockets.size === 0) {
    userSockets.delete(userId);
  }
}

function getStartupHint(error) {
  if (error.code === "ER_ACCESS_DENIED_ERROR") {
    return "TiDB login failed. Verify TIDB_USER and TIDB_PASSWORD.";
  }

  if (error.code === "ER_BAD_DB_ERROR") {
    return "The TiDB database does not exist. Create it manually or set DB_CREATE_IF_MISSING=true for the first deploy.";
  }

  if (["ECONNREFUSED", "ETIMEDOUT", "ENOTFOUND"].includes(error.code)) {
    return "TiDB Cloud is unreachable. Check the host, port, TLS settings, and IP allowlist.";
  }

  if (String(error.message || "").toLowerCase().includes("certificate")) {
    return "TLS verification failed. Check TIDB_ENABLE_SSL and TIDB_CA_PATH/TIDB_CA_CERT.";
  }

  return error.message;
}

function configureSockets(server) {
  io = new Server(server, {
    cors: {
      origin: config.server.allowedOrigins.length > 0 ? config.server.allowedOrigins : true,
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        extractBearerToken(socket.handshake.headers.authorization || "");

      if (!token) {
        next(new Error("Authentication required."));
        return;
      }

      socket.user = await resolveUserFromToken(token);
      next();
    } catch {
      next(new Error("Authentication failed."));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.user.id;
    addUserSocket(userId, socket.id);

    socket.on("join-event", (eventId) => {
      if (!eventId) {
        return;
      }

      socket.join(`event:${eventId}`);
      const room = io.sockets.adapter.rooms.get(`event:${eventId}`);
      const viewerCount = room ? room.size : 0;
      io.to(`event:${eventId}`).emit("viewer-count", { eventId, viewerCount });
    });

    socket.on("leave-event", (eventId) => {
      if (!eventId) {
        return;
      }

      socket.leave(`event:${eventId}`);
      const room = io.sockets.adapter.rooms.get(`event:${eventId}`);
      const viewerCount = room ? room.size : 0;
      io.to(`event:${eventId}`).emit("viewer-count", { eventId, viewerCount });
    });

    socket.on("disconnect", () => {
      removeUserSocket(userId, socket.id);
    });
  });
}

async function shutdown(signal, server) {
  console.log(`Received ${signal}. Shutting down EventPulse.`);

  await new Promise((resolve) => {
    server.close(() => {
      resolve();
    });
  });

  if (io) {
    await new Promise((resolve) => {
      io.close(() => resolve());
    });
  }

  await closePool();
}

async function startServer() {
  const dbInfo = await pingDatabase();
  await initDatabase();

  const app = createApp();
  const server = http.createServer(app);

  configureSockets(server);

  process.once("SIGINT", () => {
    void shutdown("SIGINT", server).finally(() => process.exit(0));
  });

  process.once("SIGTERM", () => {
    void shutdown("SIGTERM", server).finally(() => process.exit(0));
  });

  server.listen(config.server.port, config.server.host, () => {
    console.log(
      `EventPulse API listening on ${config.server.host}:${config.server.port}`,
    );
    console.log(`TiDB connection ready (${dbInfo.version}).`);
  });
}

if (process.env.NODE_ENV !== "test") {
  startServer().catch((error) => {
    console.error("Failed to start EventPulse API.");
    console.error(getStartupHint(error));
    console.error(error);
    process.exit(1);
  });
}
