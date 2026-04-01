import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from the project root (parent of 'server' directory)
dotenv.config({ path: path.join(__dirname, "..", ".env") });

function toNumber(value, fallbackValue) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallbackValue;
}

function toBoolean(value, fallbackValue = false) {
  if (value === undefined) {
    return fallbackValue;
  }

  return String(value).toLowerCase() === "true";
}

export const config = {
  port: toNumber(process.env.PORT, 4000),
  clientOrigin: process.env.CLIENT_ORIGIN || "http://127.0.0.1:5173",
  authSecret: process.env.AUTH_SECRET || "eventpulse-dev-secret",
  db: {
    host: process.env.DB_HOST || "127.0.0.1",
    port: toNumber(process.env.DB_PORT, 3306),
    user: process.env.DB_USER || "root",
    password: "anmol@123",
    name: process.env.DB_NAME || "travel_platform",
  },
  mail: {
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: toNumber(process.env.SMTP_PORT, 465),
    secure: toBoolean(process.env.SMTP_SECURE, true),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.MAIL_FROM || `EventPulse <${process.env.SMTP_USER}>`,
  },
};