import mysql from "mysql2/promise";
import { config } from "../config.js";

let poolPromise;

async function ensureDatabaseExists() {
  const connection = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
  });

  const databaseName = config.db.name.replaceAll("`", "");
  await connection.query(
    `CREATE DATABASE IF NOT EXISTS \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
  await connection.end();
}

export async function getPool() {
  if (!poolPromise) {
    poolPromise = (async () => {
      await ensureDatabaseExists();

      return mysql.createPool({
        host: config.db.host,
        port: config.db.port,
        user: config.db.user,
        password: config.db.password,
        database: config.db.name,
        waitForConnections: true,
        connectionLimit: 10,
        namedPlaceholders: true,
        dateStrings: true,
      });
    })();
  }

  return poolPromise;
}
