import { randomUUID } from "node:crypto";
import express from "express";
import { getPool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// GET reviews for an event
router.get("/:eventId", async (req, res, next) => {
  try {
    const pool = await getPool();
    const [rows] = await pool.execute(
      "SELECT * FROM reviews WHERE event_id = ? ORDER BY created_at DESC",
      [req.params.eventId]
    );

    // Calculate average rating
    const total = rows.reduce((sum, r) => sum + Number(r.rating), 0);
    const averageRating = rows.length > 0 ? (total / rows.length).toFixed(1) : 0;

    res.json({
      reviews: rows.map((r) => ({
        id: r.id,
        userId: r.user_id,
        eventId: r.event_id,
        rating: Number(r.rating),
        comment: r.comment,
        userName: r.user_name,
        createdAt: r.created_at,
      })),
      averageRating: Number(averageRating),
      totalReviews: rows.length,
    });
  } catch (error) {
    next(error);
  }
});

// POST a new review
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const eventId = String(req.body?.eventId || "").trim();
    const rating = Number(req.body?.rating);
    const comment = String(req.body?.comment || "").trim();

    if (!eventId) {
      return res.status(400).json({ message: "Event ID is required." });
    }

    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5." });
    }

    const pool = await getPool();

    // Check if user already reviewed this event
    const [existing] = await pool.execute(
      "SELECT id FROM reviews WHERE user_id = ? AND event_id = ? LIMIT 1",
      [req.user.id, eventId]
    );

    if (existing.length > 0) {
      return res.status(409).json({ message: "You have already reviewed this event." });
    }

    const id = randomUUID();
    await pool.execute(
      `INSERT INTO reviews (id, user_id, event_id, rating, comment, user_name)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, req.user.id, eventId, rating, comment, req.user.name]
    );

    res.status(201).json({
      review: {
        id,
        userId: req.user.id,
        eventId,
        rating,
        comment,
        userName: req.user.name,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
