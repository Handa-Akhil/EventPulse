import { randomUUID } from "node:crypto";
import express from "express";
import bcrypt from "bcryptjs";
import { getPool } from "../db/pool.js";
import { createAuthToken, requireAuth } from "../middleware/auth.js";
import { serializeUser } from "../utils/serializers.js";

const router = express.Router();

router.post("/signup", async (req, res, next) => {
  try {
    const name = String(req.body?.name || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");

    if (name.length < 2) {
      res.status(400).json({ message: "Please enter a valid full name." });
      return;
    }

    if (!email.includes("@")) {
      res.status(400).json({ message: "Please enter a valid email address." });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ message: "Password must be at least 6 characters." });
      return;
    }

    const pool = await getPool();
    const [existingUsers] = await pool.execute(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [email],
    );

    if (existingUsers.length > 0) {
      res.status(409).json({ message: "An account with this email already exists." });
      return;
    }

    const userId = randomUUID();
    const passwordHash = await bcrypt.hash(password, 10);

    await pool.execute(
      `INSERT INTO users (
        id,
        name,
        email,
        password_hash,
        preferences_json,
        has_onboarded
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, name, email, passwordHash, JSON.stringify([]), 0],
    );

    const [rows] = await pool.execute(
      "SELECT * FROM users WHERE id = ? LIMIT 1",
      [userId],
    );
    const user = serializeUser(rows[0]);
    const token = createAuthToken(user.id);

    res.status(201).json({ token, user });
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    const pool = await getPool();
    const [rows] = await pool.execute(
      "SELECT * FROM users WHERE email = ? LIMIT 1",
      [email],
    );

    if (rows.length === 0) {
      res.status(401).json({ message: "Invalid email or password." });
      return;
    }

    const userRow = rows[0];
    const passwordMatches = await bcrypt.compare(password, userRow.password_hash);

    if (!passwordMatches) {
      res.status(401).json({ message: "Invalid email or password." });
      return;
    }

    const user = serializeUser(userRow);
    const token = createAuthToken(user.id);

    res.json({ token, user });
  } catch (error) {
    next(error);
  }
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

router.post("/logout", requireAuth, (req, res) => {
  res.status(204).end();
});

export default router;
