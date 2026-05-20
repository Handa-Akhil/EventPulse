import { randomUUID } from "node:crypto";
import express from "express";
import { getPool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const pool = await getPool();
    const [rows] = await pool.execute(
      `SELECT f.id, f.event_id, f.created_at, e.title, e.category, e.city, e.venue,
              e.price, e.date_label, e.event_date, e.short_description, e.hero_gradient,
              e.remaining_seats, e.total_seats, e.latitude, e.longitude
       FROM favorites f
       JOIN events e ON f.event_id = e.id
       WHERE f.user_id = ?
       ORDER BY f.created_at DESC`,
      [req.user.id],
    );

    const favorites = rows.map((row) => ({
      id: row.id,
      eventId: row.event_id,
      title: row.title,
      category: row.category,
      city: row.city,
      venue: row.venue,
      price: Number(row.price),
      dateLabel: row.date_label,
      eventDate: row.event_date,
      shortDescription: row.short_description,
      heroGradient: row.hero_gradient,
      seatsLeft: row.remaining_seats !== null ? Number(row.remaining_seats) : null,
      coordinates: {
        lat: Number(row.latitude),
        lng: Number(row.longitude),
      },
      createdAt: row.created_at,
    }));

    res.json({ favorites });
  } catch (error) {
    next(error);
  }
});

router.get("/ids", requireAuth, async (req, res, next) => {
  try {
    const pool = await getPool();
    const [rows] = await pool.execute(
      "SELECT event_id FROM favorites WHERE user_id = ?",
      [req.user.id],
    );

    res.json({ favoriteIds: rows.map((row) => row.event_id) });
  } catch (error) {
    next(error);
  }
});

router.post("/:eventId", requireAuth, async (req, res, next) => {
  try {
    const pool = await getPool();
    const userId = req.user.id;
    const eventId = String(req.params.eventId || "").trim();

    const [existing] = await pool.execute(
      "SELECT id FROM favorites WHERE user_id = ? AND event_id = ? LIMIT 1",
      [userId, eventId],
    );

    if (existing.length > 0) {
      await pool.execute(
        "DELETE FROM favorites WHERE user_id = ? AND event_id = ?",
        [userId, eventId],
      );

      res.json({ favorited: false });
      return;
    }

    const [eventRows] = await pool.execute(
      "SELECT id FROM events WHERE id = ? LIMIT 1",
      [eventId],
    );

    if (eventRows.length === 0) {
      res.status(404).json({ message: "Event not found" });
      return;
    }

    await pool.execute(
      "INSERT INTO favorites (id, user_id, event_id) VALUES (?, ?, ?)",
      [randomUUID(), userId, eventId],
    );

    await pool.execute(
      "INSERT INTO notifications (id, user_id, message, type) VALUES (?, ?, ?, ?)",
      [randomUUID(), userId, "Event added to wishlist.", "info"],
    );

    res.status(201).json({ favorited: true });
  } catch (error) {
    next(error);
  }
});

export default router;
