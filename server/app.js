import express from "express";
import cors from "cors";
import authRouter from "./routes/auth.js";
import userRouter from "./routes/users.js";
import eventRouter from "./routes/events.js";
import bookingRouter from "./routes/bookings.js";

export function createApp() {
  const app = express();

  app.use(cors({ origin: true }));
  app.use(express.json());

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/users", userRouter);
  app.use("/api/events", eventRouter);
  app.use("/api/bookings", bookingRouter);

  app.use((error, req, res, next) => {
    console.error(error);
    res.status(500).json({
      message: "Unexpected server error.",
    });
  });

  return app;
}
