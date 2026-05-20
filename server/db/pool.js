import mysql from "mysql2/promise";
import { config } from "../config.js";
import { getMysqlConnectionOptions } from "./connectionOptions.js";

let poolPromise;

function escapeIdentifier(value) {
  return String(value || "").replaceAll("`", "");
}

async function ensureDatabaseExistsIfNeeded() {
  if (!config.db.createIfMissing) {
    return;
  }

  const connection = await mysql.createConnection(
    getMysqlConnectionOptions({ includeDatabase: false }),
  );

  try {
    const databaseName = escapeIdentifier(config.db.name);
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
  } finally {
    await connection.end();
  }
}

export async function getPool() {
  if (!poolPromise) {
    poolPromise = (async () => {
      await ensureDatabaseExistsIfNeeded();

      return mysql.createPool({
        ...getMysqlConnectionOptions(),
        waitForConnections: true,
        connectionLimit: config.db.connectionLimit,
        queueLimit: config.db.queueLimit,
        namedPlaceholders: true,
        dateStrings: true,
        decimalNumbers: true,
      });
    })();
  }

  return poolPromise;
}

export async function pingDatabase() {
  const pool = await getPool();
  const [rows] = await pool.query("SELECT VERSION() AS version");
  return rows[0] || { version: "unknown" };
}

export async function closePool() {
  if (!poolPromise) {
    return;
  }

  const pool = await poolPromise;
  await pool.end();
  poolPromise = undefined;
}
