import { randomUUID } from "node:crypto";
import express from "express";
import { getPool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";
import { serializeBooking, serializeEvent } from "../utils/serializers.js";

const router = express.Router();

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const limit = Number.isFinite(Number(req.query.limit))
      ? Number(req.query.limit)
      : 0;
    const pool = await getPool();
    const [rows] = await pool.execute(
      "SELECT * FROM bookings WHERE user_id = ? ORDER BY created_at DESC",
      [req.user.id],
    );

    const bookings = rows
      .map((row) => serializeBooking(row))
      .slice(0, limit > 0 ? limit : undefined);

    res.json({ bookings });
  } catch (error) {
    next(error);
  }
});

router.post("/", requireAuth, async (req, res, next) => {
  try {
    const eventId = String(req.body?.eventId || "").trim();
    const slot = String(req.body?.slot || "").trim();
    const quantity = Number.parseInt(String(req.body?.quantity || "0"), 10);

    if (!eventId || !slot || !Number.isFinite(quantity) || quantity < 1 || quantity > 6) {
      res.status(400).json({ message: "A valid booking request is required." });
      return;
    }

    const pool = await getPool();
    const [rows] = await pool.execute(
      "SELECT * FROM events WHERE id = ? LIMIT 1",
      [eventId],
    );

    if (rows.length === 0) {
      res.status(404).json({ message: "Selected event does not exist." });
      return;
    }

    const event = serializeEvent(rows[0]);

    if (!event.showtimes.includes(slot)) {
      res.status(400).json({ message: "Selected showtime is not available." });
      return;
    }

    const bookingId = randomUUID();
    const total = quantity * event.price;

    await pool.execute(
      `INSERT INTO bookings (
        id,
        user_id,
        event_id,
        title,
        venue,
        date_label,
        slot,
        quantity,
        total
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        bookingId,
        req.user.id,
        event.id,
        event.title,
        event.venue,
        event.dateLabel,
        slot,
        quantity,
        total,
      ],
    );

    const [bookingRows] = await pool.execute(
      "SELECT * FROM bookings WHERE id = ? LIMIT 1",
      [bookingId],
    );

    res.status(201).json({ booking: serializeBooking(bookingRows[0]) });
  } catch (error) {
    next(error);
  }
});

export default router;
