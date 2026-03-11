import express from "express";
import { getPool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";
import { serializeUser } from "../utils/serializers.js";

const router = express.Router();

router.put("/me/preferences", requireAuth, async (req, res, next) => {
  try {
    if (!Array.isArray(req.body?.preferences)) {
      res.status(400).json({ message: "Preferences must be an array." });
      return;
    }

    const preferences = [...new Set(
      req.body.preferences
        .map((value) => String(value || "").trim())
        .filter(Boolean),
    )];

    const pool = await getPool();
    await pool.execute(
      `UPDATE users
       SET preferences_json = ?, has_onboarded = 1
       WHERE id = ?`,
      [JSON.stringify(preferences), req.user.id],
    );

    const [rows] = await pool.execute(
      "SELECT * FROM users WHERE id = ? LIMIT 1",
      [req.user.id],
    );

    res.json({ user: serializeUser(rows[0]) });
  } catch (error) {
    next(error);
  }
});

router.get("/me/location", requireAuth, (req, res) => {
  res.json({ location: req.user.savedLocation });
});

router.put("/me/location", requireAuth, async (req, res, next) => {
  try {
    const label = String(req.body?.label || "").trim();
    const city = String(req.body?.city || "").trim();
    const region = String(req.body?.region || "").trim();
    const source = String(req.body?.source || "manual").trim();
    const lat = Number(req.body?.lat);
    const lng = Number(req.body?.lng);

    if (!label || !city || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      res.status(400).json({ message: "A complete location is required." });
      return;
    }

    const location = {
      label,
      city,
      region,
      lat,
      lng,
      source,
    };

    const pool = await getPool();
    await pool.execute(
      "UPDATE users SET saved_location_json = ? WHERE id = ?",
      [JSON.stringify(location), req.user.id],
    );

    res.json({ location });
  } catch (error) {
    next(error);
  }
});

export default router;
