import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { getPool } from "../db/pool.js";
import { serializeUser } from "../utils/serializers.js";

export function createAuthToken(userId) {
  return jwt.sign({ userId }, config.authSecret, {
    expiresIn: "7d",
  });
}

export async function requireAuth(req, res, next) {
  const authorizationHeader = req.headers.authorization || "";

  if (!authorizationHeader.startsWith("Bearer ")) {
    res.status(401).json({ message: "Authentication is required." });
    return;
  }

  const token = authorizationHeader.slice("Bearer ".length);

  try {
    const payload = jwt.verify(token, config.authSecret);
    const pool = await getPool();
    const [rows] = await pool.execute(
      "SELECT * FROM users WHERE id = ? LIMIT 1",
      [payload.userId],
    );

    if (rows.length === 0) {
      res.status(401).json({ message: "Session is no longer valid." });
      return;
    }

    req.user = serializeUser(rows[0]);
    next();
  } catch {
    res.status(401).json({ message: "Invalid session token." });
  }
}
