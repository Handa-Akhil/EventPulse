// // added
// import { sendNotification } from "../services/notificationService.js";
// import { sendEmail } from "../services/emailService.js";
// // added
// import { randomUUID } from "node:crypto";
// import express from "express";
// import { getPool } from "../db/pool.js";
// import { requireAuth } from "../middleware/auth.js";
// import { serializeBooking, serializeEvent } from "../utils/serializers.js";

// const router = express.Router();

// router.get("/", requireAuth, async (req, res, next) => {
//   try {
//     const limit = Number.isFinite(Number(req.query.limit))
//       ? Number(req.query.limit)
//       : 0;
//     const pool = await getPool();
//     const [rows] = await pool.execute(
//       "SELECT * FROM bookings WHERE user_id = ? ORDER BY created_at DESC",
//       [req.user.id],
//     );

//     const bookings = rows
//       .map((row) => serializeBooking(row))
//       .slice(0, limit > 0 ? limit : undefined);

//     res.json({ bookings });
//   } catch (error) {
//     next(error);
//   }
// });

// router.post("/", requireAuth, async (req, res, next) => {
//   try {
//     const eventId = String(req.body?.eventId || "").trim();
//     const slot = String(req.body?.slot || "").trim();
//     const quantity = Number.parseInt(String(req.body?.quantity || "0"), 10);

//     if (!eventId || !slot || !Number.isFinite(quantity) || quantity < 1 || quantity > 6) {
//       res.status(400).json({ message: "A valid booking request is required." });
//       return;
//     }

//     const pool = await getPool();
//     const [rows] = await pool.execute(
//       "SELECT * FROM events WHERE id = ? LIMIT 1",
//       [eventId],
//     );

//     if (rows.length === 0) {
//       res.status(404).json({ message: "Selected event does not exist." });
//       return;
//     }

//     const event = serializeEvent(rows[0]);

//     if (!event.showtimes.includes(slot)) {
//       res.status(400).json({ message: "Selected showtime is not available." });
//       return;
//     }

//     const bookingId = randomUUID();
//     const total = quantity * event.price;

//     await pool.execute(
//       `INSERT INTO bookings (
//         id,
//         user_id,
//         event_id,
//         title,
//         venue,
//         date_label,
//         slot,
//         quantity,
//         total
//       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//       [
//         bookingId,
//         req.user.id,
//         event.id,
//         event.title,
//         event.venue,
//         event.dateLabel,
//         slot,
//         quantity,
//         total,
//       ],
//     );

//     const [bookingRows] = await pool.execute(
//       "SELECT * FROM bookings WHERE id = ? LIMIT 1",
//       [bookingId],
//     );

//     res.status(201).json({ booking: serializeBooking(bookingRows[0]) });
//   } catch (error) {
//     next(error);
//   }
// });

// export default router;
// added
import { sendNotification } from "../services/notificationService.js";
import { sendEmail } from "../services/emailService.js";

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
  const pool = await getPool();
  const connection = await pool.getConnection();

  try {
    const eventId = String(req.body?.eventId || "").trim();
    const slot = String(req.body?.slot || "").trim();
    const quantity = Number.parseInt(String(req.body?.quantity || "0"), 10);

    if (!eventId || !slot || !Number.isFinite(quantity) || quantity < 1 || quantity > 20) {
      res.status(400).json({ message: "A valid booking request is required." });
      return;
    }

    await connection.beginTransaction();

    const [rows] = await connection.execute(
      "SELECT * FROM events WHERE id = ? LIMIT 1 FOR UPDATE",
      [eventId],
    );

    if (rows.length === 0) {
      await connection.rollback();
      res.status(404).json({ message: "Selected event does not exist." });
      return;
    }

    const event = serializeEvent(rows[0]);

    if (!event.showtimes.includes(slot)) {
      await connection.rollback();
      res.status(400).json({ message: "Selected showtime is not available." });
      return;
    }

    if (typeof event.seatsLeft !== "number") {
      await connection.rollback();
      res.status(500).json({ message: "Seat availability is not configured for this event." });
      return;
    }

    if (event.seatsLeft <= 0) {
      await connection.rollback();
      res.status(400).json({ message: "This event is sold out." });
      return;
    }

    if (quantity > event.seatsLeft) {
      await connection.rollback();
      res.status(400).json({ message: `Only ${event.seatsLeft} seat(s) left.` });
      return;
    }

    const bookingId = randomUUID();
    const total = quantity * event.price;
    const updatedRemainingSeats = event.seatsLeft - quantity;

    await connection.execute(
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

    await connection.execute(
      `UPDATE events
       SET remaining_seats = ?
       WHERE id = ?`,
      [updatedRemainingSeats, event.id],
    );

    const [bookingRows] = await connection.execute(
      "SELECT * FROM bookings WHERE id = ? LIMIT 1",
      [bookingId],
    );

    await connection.commit();

    const booking = serializeBooking(bookingRows[0]);

    await sendNotification(
      req.user.id,
      `Booking confirmed for "${event.title}" at ${event.venue} on ${event.dateLabel}`,
    );

    if (req.user?.email) {
      await sendEmail(
        req.user.email,
        "EventPulse Booking Confirmation",
        `Hi ${req.user.name || "User"},
        
Your booking has been confirmed.

Event: ${event.title}
Venue: ${event.venue}
Date: ${event.dateLabel}
Time Slot: ${slot}
Tickets: ${quantity}
Total Paid: ₹${total}

Thank you for using EventPulse!`,
      );
    }

    res.status(201).json({ booking });
  } catch (error) {
    try {
      await connection.rollback();
    } catch {}

    next(error);
  } finally {
    connection.release();
  }
});

export default router;