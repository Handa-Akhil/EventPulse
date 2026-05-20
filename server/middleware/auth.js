import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { getPool } from "../db/pool.js";
import { serializeUser } from "../utils/serializers.js";

function isRoleAllowed(payload, expectedRole) {
  if (!payload?.role) {
    return expectedRole === "user";
  }

  return payload.role === expectedRole;
}

function verifyJwtToken(token, secret, options = {}) {
  const { audience, allowLegacy = false, expectedRole } = options;

  try {
    const payload = jwt.verify(token, secret, {
      issuer: config.auth.issuer,
      audience,
    });

    if (!isRoleAllowed(payload, expectedRole)) {
      throw new Error("Invalid session token.");
    }

    return payload;
  } catch (error) {
    if (!allowLegacy) {
      throw error;
    }

    const payload = jwt.verify(token, secret);
    if (!isRoleAllowed(payload, expectedRole)) {
      throw error;
    }

    return payload;
  }
}

export function extractBearerToken(authorizationHeader = "") {
  if (!authorizationHeader.startsWith("Bearer ")) {
    return null;
  }

  return authorizationHeader.slice("Bearer ".length).trim() || null;
}

export function createAuthToken(userId) {
  return jwt.sign(
    {
      userId,
      role: "user",
    },
    config.auth.secret,
    {
      expiresIn: config.auth.expiresIn || "7d",
      issuer: config.auth.issuer,
      audience: config.auth.audience,
      subject: userId,
    },
  );
}

export function createAdminToken(adminEmail) {
  return jwt.sign(
    {
      role: "admin",
      email: adminEmail,
      name: config.adminAuth.name,
    },
    config.adminAuth.secret,
    {
      expiresIn: config.adminAuth.expiresIn || "12h",
      issuer: config.auth.issuer,
      audience: "eventpulse-admin",
      subject: adminEmail,
    },
  );
}

export async function resolveUserFromToken(token) {
  const payload = verifyJwtToken(token, config.auth.secret, {
    audience: config.auth.audience,
    allowLegacy: true,
    expectedRole: "user",
  });

  const pool = await getPool();
  const [rows] = await pool.execute(
    "SELECT * FROM users WHERE id = ? LIMIT 1",
    [payload.userId],
  );

  if (rows.length === 0) {
    throw new Error("Session is no longer valid.");
  }

  return serializeUser(rows[0]);
}

export async function requireAuth(req, res, next) {
  const token = extractBearerToken(req.headers.authorization || "");

  if (!token) {
    res.status(401).json({ message: "Authentication is required." });
    return;
  }

  try {
    req.user = await resolveUserFromToken(token);
    next();
  } catch (error) {
    res.status(401).json({ message: error.message || "Invalid session token." });
  }
}

export function requireAdminAuth(req, res, next) {
  const token = extractBearerToken(req.headers.authorization || "");

  if (!token) {
    res.status(401).json({ message: "Admin authentication is required." });
    return;
  }

  try {
    const payload = verifyJwtToken(token, config.adminAuth.secret, {
      audience: "eventpulse-admin",
      expectedRole: "admin",
    });

    req.admin = {
      email: payload.email,
      name: payload.name || config.adminAuth.name,
    };

    next();
  } catch {
    res.status(401).json({ message: "Invalid admin session token." });
  }
}
