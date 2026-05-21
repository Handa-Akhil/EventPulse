import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "..", ".env") });

function toNumber(value, fallbackValue) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : fallbackValue;
}

function toBoolean(value, fallbackValue = false) {
  if (value === undefined || value === null || value === "") {
    return fallbackValue;
  }

  return String(value).trim().toLowerCase() === "true";
}

function toList(value) {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeUrl(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

const env = process.env.NODE_ENV || "development";
const isProduction = env === "production";
const isTest = env === "test";
const isRender = String(process.env.RENDER || "").toLowerCase() === "true";
const shouldServeStaticClient = isProduction || isRender;

function parseDatabaseEnv() {
  const connectionString =
    process.env.DATABASE_URL || process.env.TIDB_URL || process.env.MYSQL_URL || "";

  let host = process.env.TIDB_HOST || process.env.DB_HOST || "";
  let port = process.env.TIDB_PORT || process.env.DB_PORT || "";
  let user = process.env.TIDB_USER || process.env.DB_USER || "";
  let password = process.env.TIDB_PASSWORD || process.env.DB_PASSWORD || "";
  let name = process.env.TIDB_DB_NAME || process.env.DB_NAME || "";

  if (connectionString) {
    try {
      const parsedUrl = new URL(connectionString);

      host ||= parsedUrl.hostname;
      port ||= parsedUrl.port;
      user ||= decodeURIComponent(parsedUrl.username);
      password ||= decodeURIComponent(parsedUrl.password);
      name ||= parsedUrl.pathname.replace(/^\//, "");
    } catch (error) {
      if (!isTest) {
        console.warn("Ignoring invalid DATABASE_URL/TIDB_URL value.");
      }
    }
  }

  return {
    host,
    port: toNumber(port, 4000),
    user,
    password,
    name,
  };
}

function getRequiredEnvValue(label, value) {
  if (value) {
    return value;
  }

  if (isProduction) {
    throw new Error(`${label} must be configured in production.`);
  }

  return "";
}

const publicAppUrl = normalizeUrl(
  process.env.PUBLIC_APP_URL || process.env.RENDER_EXTERNAL_URL || "",
);

const allowedOrigins = Array.from(
  new Set(
    [publicAppUrl, ...toList(process.env.CLIENT_ORIGIN), ...toList(process.env.CLIENT_ORIGINS)]
      .map(normalizeUrl)
      .filter(Boolean),
  ),
);

const databaseEnv = parseDatabaseEnv();

export const config = {
  env,
  isProduction,
  isTest,
  isRender,
  server: {
    host: process.env.HOST || "0.0.0.0",
    port: toNumber(process.env.PORT, 4000),
    trustProxy: toBoolean(process.env.TRUST_PROXY, isRender),
    publicAppUrl,
    allowedOrigins,
    serveStaticClient: toBoolean(process.env.SERVE_STATIC_CLIENT, shouldServeStaticClient),
  },
  auth: {
    secret: getRequiredEnvValue(
      "AUTH_SECRET",
      process.env.AUTH_SECRET || process.env.JWT_SECRET,
    ),
    expiresIn: process.env.AUTH_TOKEN_TTL || "7d",
    issuer: process.env.AUTH_ISSUER || "eventpulse-api",
    audience: process.env.AUTH_AUDIENCE || "eventpulse-client",
  },
  adminAuth: {
    email: getRequiredEnvValue("ADMIN_EMAIL", process.env.ADMIN_EMAIL),
    password: process.env.ADMIN_PASSWORD || "",
    passwordHash: process.env.ADMIN_PASSWORD_HASH || "",
    secret: getRequiredEnvValue(
      "ADMIN_AUTH_SECRET",
      process.env.ADMIN_AUTH_SECRET ||
        process.env.AUTH_SECRET ||
        process.env.JWT_SECRET,
    ),
    expiresIn: process.env.ADMIN_AUTH_TOKEN_TTL || "12h",
    name: process.env.ADMIN_NAME || "EventPulse Admin",
  },
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || "",
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || "",
    privateKey: String(process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
    serviceAccount:
      process.env.FIREBASE_SERVICE_ACCOUNT ||
      process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 ||
      "",
  },
  db: {
    provider: "tidb",
    host: getRequiredEnvValue(
      "TIDB_HOST/DB_HOST or DATABASE_URL",
      databaseEnv.host,
    ),
    port: databaseEnv.port,
    user: getRequiredEnvValue(
      "TIDB_USER/DB_USER or DATABASE_URL",
      databaseEnv.user,
    ),
    password: getRequiredEnvValue(
      "TIDB_PASSWORD/DB_PASSWORD or DATABASE_URL",
      databaseEnv.password,
    ),
    name: getRequiredEnvValue(
      "TIDB_DB_NAME/DB_NAME or DATABASE_URL",
      databaseEnv.name,
    ),
    createIfMissing: toBoolean(process.env.DB_CREATE_IF_MISSING, false),
    seedSampleEvents: toBoolean(process.env.SEED_SAMPLE_EVENTS, true),
    connectionLimit: toNumber(process.env.DB_CONNECTION_LIMIT, 10),
    queueLimit: toNumber(process.env.DB_QUEUE_LIMIT, 0),
    connectTimeoutMs: toNumber(process.env.DB_CONNECT_TIMEOUT_MS, 10000),
    enableSsl: toBoolean(
      process.env.TIDB_ENABLE_SSL ?? process.env.DB_ENABLE_SSL,
      true,
    ),
    sslCaPath: process.env.TIDB_CA_PATH || process.env.DB_SSL_CA_PATH || "",
    sslCa: String(process.env.TIDB_CA_CERT || process.env.DB_SSL_CA || "").replace(
      /\\n/g,
      "\n",
    ),
  },
  mail: {
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: toNumber(process.env.SMTP_PORT, 465),
    secure: toBoolean(process.env.SMTP_SECURE, true),
    user: process.env.SMTP_USER || process.env.EMAIL_USER || "",
    pass: process.env.SMTP_PASS || process.env.EMAIL_PASS || "",
    timeoutMs: toNumber(process.env.SMTP_TIMEOUT_MS || process.env.EMAIL_TIMEOUT_MS, 8000),
    from:
      process.env.MAIL_FROM ||
      `EventPulse <${process.env.SMTP_USER || process.env.EMAIL_USER || ""}>`,
  },
  logging: {
    enableEmailDebug: toBoolean(process.env.LOG_EMAIL_TRANSACTIONS, false),
  },
};

if (isProduction && !config.adminAuth.password && !config.adminAuth.passwordHash) {
  throw new Error("ADMIN_PASSWORD or ADMIN_PASSWORD_HASH must be configured in production.");
}
