import { randomInt, randomUUID } from "node:crypto";
import express from "express";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { config } from "../config.js";
import { getPool } from "../db/pool.js";
import { createAuthToken, requireAuth } from "../middleware/auth.js";
import { sendEmail } from "../services/emailService.js";
import {
  isFirebaseAdminConfigured,
  verifyFirebaseIdToken,
} from "../services/firebaseAdmin.js";
import { serializeUser } from "../utils/serializers.js";

const router = express.Router();
const PASSWORD_RESET_OTP_LENGTH = 6;
const PASSWORD_RESET_OTP_EXPIRY_MINUTES = 10;
const authWriteLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: config.isProduction ? 20 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many authentication attempts. Please try again later.",
  },
});

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizePassword(value) {
  return String(value || "").trim();
}

function createPasswordResetOtp() {
  const min = 10 ** (PASSWORD_RESET_OTP_LENGTH - 1);
  const max = 10 ** PASSWORD_RESET_OTP_LENGTH;
  return String(randomInt(min, max));
}

function getGoogleProfileName(payload, email) {
  const name = String(payload?.name || "").trim();

  if (name.length >= 2) {
    return name;
  }

  const emailName = email.split("@")[0]?.replace(/[._-]+/g, " ").trim();

  if (emailName && emailName.length >= 2) {
    return emailName.replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  return "Google User";
}

async function clearPasswordResetState(pool, userId) {
  await pool.execute(
    `UPDATE users
     SET password_reset_otp_hash = NULL,
         password_reset_otp_expires_at = NULL
     WHERE id = ?`,
    [userId],
  );
}

function createPasswordResetEmail(userName, otp) {
  const greetingName = userName || "there";

  return {
    subject: "EventPulse password reset OTP",
    text: [
      `Hi ${greetingName},`,
      "",
      `Your EventPulse password reset OTP is ${otp}.`,
      `This code will expire in ${PASSWORD_RESET_OTP_EXPIRY_MINUTES} minutes.`,
      "",
      "If you did not request this reset, you can ignore this email.",
    ].join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6;">
        <p>Hi ${greetingName},</p>
        <p>Your EventPulse password reset OTP is:</p>
        <p style="font-size: 28px; font-weight: 700; letter-spacing: 6px; margin: 20px 0;">
          ${otp}
        </p>
        <p>This code will expire in ${PASSWORD_RESET_OTP_EXPIRY_MINUTES} minutes.</p>
        <p>If you did not request this reset, you can ignore this email.</p>
      </div>
    `,
  };
}

async function getUserByEmail(pool, email) {
  const [rows] = await pool.execute(
    "SELECT * FROM users WHERE email = ? LIMIT 1",
    [email],
  );

  return rows[0] || null;
}

async function createWelcomeNotification(pool, userId, name) {
  const notifId = randomUUID();

  await pool.execute(
    "INSERT INTO notifications (id, user_id, message, type) VALUES (?, ?, ?, ?)",
    [
      notifId,
      userId,
      `Welcome to EventPulse, ${name}! Start exploring and booking amazing events near you.`,
      "info",
    ],
  );
}

router.post("/signup", authWriteLimiter, async (req, res, next) => {
  try {
    const name = String(req.body?.name || "").trim();
    const email = normalizeEmail(req.body?.email);
    const password = normalizePassword(req.body?.password);

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

    if (!rows || rows.length === 0) {
      return res.status(500).json({ message: "Failed to create user account." });
    }

    const user = serializeUser(rows[0]);
    const token = createAuthToken(user.id);

    await createWelcomeNotification(pool, userId, name);

    res.status(201).json({ token, user });
  } catch (error) {
    next(error);
  }
});

router.post("/login", authWriteLimiter, async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = normalizePassword(req.body?.password);

    if (!email || !password) {
      res.status(400).json({ message: "Email and password are required." });
      return;
    }

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

router.post("/google", authWriteLimiter, async (req, res, next) => {
  try {
    const idToken = String(req.body?.idToken || req.body?.credential || "").trim();

    if (!isFirebaseAdminConfigured()) {
      res.status(500).json({ message: "Firebase Google login is not configured." });
      return;
    }

    if (!idToken) {
      res.status(400).json({ message: "Firebase ID token is required." });
      return;
    }

    let payload;

    try {
      payload = await verifyFirebaseIdToken(idToken);
    } catch {
      res.status(401).json({ message: "Unable to verify Firebase Google account." });
      return;
    }

    const email = normalizeEmail(payload?.email);
    const signInProvider = payload?.firebase?.sign_in_provider;

    if (!payload?.email_verified || !email) {
      res.status(401).json({ message: "Please use a verified Google account." });
      return;
    }

    if (signInProvider !== "google.com") {
      res.status(401).json({ message: "Please sign in with Google through Firebase." });
      return;
    }

    const pool = await getPool();
    let userRow = await getUserByEmail(pool, email);

    if (!userRow) {
      const userId = randomUUID();
      const name = getGoogleProfileName(payload, email);
      const passwordHash = await bcrypt.hash(randomUUID(), 10);

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

      await createWelcomeNotification(pool, userId, name);

      userRow = await getUserByEmail(pool, email);

      if (!userRow) {
        res.status(500).json({ message: "Failed to create Google account." });
        return;
      }
    }

    const user = serializeUser(userRow);
    const token = createAuthToken(user.id);

    res.json({ token, user });
  } catch (error) {
    next(error);
  }
});

router.post("/forgot-password/request", authWriteLimiter, async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email);

    if (!email || !email.includes("@")) {
      res.status(400).json({ message: "Please enter a valid registered email address." });
      return;
    }

    const pool = await getPool();
    const user = await getUserByEmail(pool, email);

    if (!user) {
      res.status(404).json({
        message: "No account was found with this registered email address.",
      });
      return;
    }

    const otp = createPasswordResetOtp();
    const otpHash = await bcrypt.hash(otp, 10);

    await pool.execute(
      `UPDATE users
       SET password_reset_otp_hash = ?,
           password_reset_otp_expires_at = DATE_ADD(NOW(), INTERVAL ? MINUTE)
       WHERE id = ?`,
      [otpHash, PASSWORD_RESET_OTP_EXPIRY_MINUTES, user.id],
    );

    try {
      const emailContent = createPasswordResetEmail(user.name, otp);

      await sendEmail(
        user.email,
        emailContent.subject,
        emailContent.text,
        emailContent.html,
      );
    } catch (emailError) {
      await clearPasswordResetState(pool, user.id);
      console.error("Failed to send password reset OTP email:", emailError.message);
      res.status(500).json({
        message: "Unable to send OTP email right now. Please check the server email configuration.",
      });
      return;
    }

    res.json({
      message: "An OTP has been sent to your registered email address.",
    });
  } catch (error) {
    next(error);
  }
});

router.post("/forgot-password/verify", authWriteLimiter, async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const otp = String(req.body?.otp || "").trim();

    if (!email || !otp) {
      res.status(400).json({ message: "Email and OTP are required." });
      return;
    }

    const pool = await getPool();
    const user = await getUserByEmail(pool, email);

    if (!user?.password_reset_otp_hash) {
      res.status(400).json({
        message: "Please request a new OTP before changing your password.",
      });
      return;
    }

    const [statusRows] = await pool.execute(
      `SELECT password_reset_otp_expires_at > NOW() AS otp_is_active
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [user.id],
    );

    if (!statusRows[0]?.otp_is_active) {
      await clearPasswordResetState(pool, user.id);
      res.status(400).json({
        message: "OTP has expired. Please request a new OTP.",
      });
      return;
    }

    const otpMatches = await bcrypt.compare(otp, user.password_reset_otp_hash);

    if (!otpMatches) {
      res.status(400).json({
        message: "Enter a valid OTP that was sent to your registered email address.",
      });
      return;
    }

    res.json({ message: "OTP verified successfully." });
  } catch (error) {
    next(error);
  }
});

router.post("/forgot-password/reset", authWriteLimiter, async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const otp = String(req.body?.otp || "").trim();
    const password = normalizePassword(req.body?.password);
    const confirmPassword = normalizePassword(req.body?.confirmPassword);

    if (!email || !otp || !password || !confirmPassword) {
      res.status(400).json({ message: "Email, OTP, new password, and confirm password are required." });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ message: "Password must be at least 6 characters." });
      return;
    }

    if (password !== confirmPassword) {
      res.status(400).json({ message: "New password and confirm password must match." });
      return;
    }

    const pool = await getPool();
    const user = await getUserByEmail(pool, email);

    if (!user?.password_reset_otp_hash) {
      res.status(400).json({
        message: "Please request a new OTP before changing your password.",
      });
      return;
    }

    const [statusRows] = await pool.execute(
      `SELECT password_reset_otp_expires_at > NOW() AS otp_is_active
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [user.id],
    );

    if (!statusRows[0]?.otp_is_active) {
      await clearPasswordResetState(pool, user.id);
      res.status(400).json({
        message: "OTP has expired. Please request a new OTP.",
      });
      return;
    }

    const otpMatches = await bcrypt.compare(otp, user.password_reset_otp_hash);

    if (!otpMatches) {
      res.status(400).json({
        message: "Enter a valid OTP that was sent to your registered email address.",
      });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await pool.execute(
      `UPDATE users
       SET password_hash = ?,
           password_reset_otp_hash = NULL,
           password_reset_otp_expires_at = NULL
       WHERE id = ?`,
      [passwordHash, user.id],
    );

    res.json({
      message: "Password updated successfully. Please log in with your new password.",
    });
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
