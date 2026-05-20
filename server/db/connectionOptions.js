import fs from "node:fs";
import { config } from "../config.js";

let cachedSslOptions;

function getSslOptions() {
  if (!config.db.enableSsl) {
    return undefined;
  }

  if (cachedSslOptions) {
    return cachedSslOptions;
  }

  const sslOptions = {
    minVersion: "TLSv1.2",
    rejectUnauthorized: true,
  };

  if (config.db.sslCa) {
    sslOptions.ca = config.db.sslCa;
  } else if (config.db.sslCaPath) {
    sslOptions.ca = fs.readFileSync(config.db.sslCaPath, "utf8");
  }

  cachedSslOptions = sslOptions;
  return cachedSslOptions;
}

export function getMysqlConnectionOptions({ includeDatabase = true } = {}) {
  const connectionOptions = {
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    connectTimeout: config.db.connectTimeoutMs,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
  };

  if (includeDatabase) {
    connectionOptions.database = config.db.name;
  }

  const sslOptions = getSslOptions();
  if (sslOptions) {
    connectionOptions.ssl = sslOptions;
  }

  return connectionOptions;
}

export function getSequelizeOptions() {
  const sequelizeOptions = {
    dialect: "mysql",
    host: config.db.host,
    port: config.db.port,
    logging: false,
    define: {
      underscored: true,
    },
    pool: {
      max: config.db.connectionLimit,
      min: 0,
      idle: 10000,
      acquire: config.db.connectTimeoutMs,
      evict: 1000,
    },
  };

  const sslOptions = getSslOptions();
  if (sslOptions) {
    sequelizeOptions.dialectOptions = {
      ssl: sslOptions,
    };
  }

  return sequelizeOptions;
}
