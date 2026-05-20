import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import compression from "compression";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { config } from "./config.js";
import adminRoutes from "./routes/admin.js";
import authRouter from "./routes/auth.js";
import bookingRouter from "./routes/bookings.js";
import eventRouter from "./routes/events.js";
import favoriteRouter from "./routes/favorites.js";
import notificationRouter from "./routes/notifications.js";
import reviewRouter from "./routes/reviews.js";
import userRouter from "./routes/users.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, "..");
const distPath = path.join(projectRoot, "dist");
const clientIndexPath = path.join(distPath, "index.html");

function createCorsOptions() {
  const allowedOrigins = new Set(config.server.allowedOrigins);

  return {
    credentials: true,
    origin(origin, callback) {
      if (!origin || allowedOrigins.size === 0 || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS.`));
    },
  };
}

export function createApp() {
  const app = express();

  if (config.server.trustProxy) {
    app.set("trust proxy", 1);
  }

  app.disable("x-powered-by");
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(compression());
  app.use(cors(createCorsOptions()));
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: false, limit: "1mb" }));

  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      environment: config.env,
      database: config.db.provider,
    });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/users", userRouter);
  app.use("/api/events", eventRouter);
  app.use("/api/bookings", bookingRouter);
  app.use("/api/reviews", reviewRouter);
  app.use("/api/notifications", notificationRouter);
  app.use("/api/favorites", favoriteRouter);
  app.use("/api/admin", adminRoutes);

  app.use("/api", (req, res) => {
    res.status(404).json({ message: "API endpoint not found." });
  });

  if (fs.existsSync(clientIndexPath)) {
    app.use(express.static(distPath));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api")) {
        next();
        return;
      }

      res.sendFile(clientIndexPath);
    });
  } else if (config.server.serveStaticClient) {
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api")) {
        next();
        return;
      }

      res.status(503).type("text/plain").send(
        "Client build not found. Run `npm run build` before starting the server.",
      );
    });
  }

  app.use((error, req, res, next) => {
    const statusCode = error.message?.includes("CORS") ? 403 : error.status || 500;

    console.error("API Error:", {
      message: error.message,
      code: error.code,
      status: statusCode,
      path: req.path,
      method: req.method,
    });

    if (!config.isProduction && error.stack) {
      console.error(error.stack);
    }

    res.status(statusCode).json({
      message:
        statusCode === 500
          ? "Unexpected server error."
          : error.message || "Request failed.",
    });
  });

  return app;
}
