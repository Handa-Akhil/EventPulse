import dotenv from "dotenv";

dotenv.config();

function toNumber(value, fallbackValue) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallbackValue;
}

export const config = {
  port: toNumber(process.env.PORT, 4000),
  clientOrigin: process.env.CLIENT_ORIGIN || "http://127.0.0.1:5173",
  authSecret: process.env.AUTH_SECRET || "eventpulse-dev-secret",
  db: {
    host: process.env.DB_HOST || "127.0.0.1",
    port: toNumber(process.env.DB_PORT, 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    name: process.env.DB_NAME || "eventpulse",
  },
};
