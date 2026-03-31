import mysql from "mysql2/promise";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

async function test() {
  const log = (msg) => {
    console.log(msg);
    fs.appendFileSync("test-db.results.txt", msg + "\n");
  };

  try {
    log("Testing connection with: " + JSON.stringify({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD ? "****" : "(empty)",
      database: process.env.DB_NAME,
    }, null, 2));

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Connection timed out after 5s")), 5000)
    );

    const connectionPromise = mysql.createConnection({
        host: process.env.DB_HOST || "127.0.0.1",
        port: Number(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD || "",
        connectTimeout: 5000,
    });

    const connection = await Promise.race([connectionPromise, timeoutPromise]);
    log("Connection successful!");
    await connection.end();
  } catch (err) {
    log("Connection failed: " + err.message);
    process.exit(1);
  }
}

fs.writeFileSync("test-db.results.txt", ""); // Clear file
test();
