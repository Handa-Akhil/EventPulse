import { randomUUID } from "node:crypto";
import express from "express";
import QRCode from "qrcode";
import { getPool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";
import { serializeBooking, serializeEvent } from "../utils/serializers.js";
import { config } from "../config.js";
import { sendEmail } from "../services/emailService.js";
import { emitToUser, emitToEventRoom } from "../index.js";

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

// GET single booking ticket data
router.get("/:id/ticket", requireAuth, async (req, res, next) => {
  try {
    const pool = await getPool();
    const [rows] = await pool.execute(
      "SELECT * FROM bookings WHERE id = ? AND user_id = ? LIMIT 1",
      [req.params.id, req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Booking not found." });
    }

    const booking = serializeBooking(rows[0]);

    // Generate QR code
    const qrPayload = JSON.stringify({
      bookingId: booking.id,
      event: booking.title,
      venue: booking.venue,
      date: booking.dateLabel,
      slot: booking.slot,
      tickets: booking.quantity,
      ref: booking.id.slice(-6).toUpperCase(),
    });

    const qrDataUrl = await QRCode.toDataURL(qrPayload, {
      width: 280,
      margin: 2,
      color: { dark: "#1a1118", light: "#fff6ef" },
    });

    res.json({ booking, qrDataUrl });
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

    // Create notification
    const notifId = randomUUID();
    await connection.execute(
      `INSERT INTO notifications (id, user_id, message, type) VALUES (?, ?, ?, ?)`,
      [
        notifId,
        req.user.id,
        `Booking confirmed for "${event.title}" — ${quantity} ticket(s) at ${slot}`,
        "booking",
      ]
    );

    await connection.commit();

    const booking = serializeBooking(bookingRows[0]);

    // Generate QR code for the e-ticket
    let qrDataUrl = null;
    try {
      const qrPayload = JSON.stringify({
        bookingId: booking.id,
        event: booking.title,
        venue: booking.venue,
        date: booking.dateLabel,
        slot: booking.slot,
        tickets: booking.quantity,
        ref: booking.id.slice(-6).toUpperCase(),
      });

      qrDataUrl = await QRCode.toDataURL(qrPayload, {
        width: 280,
        margin: 2,
        color: { dark: "#1a1118", light: "#fff6ef" },
      });
    } catch (qrError) {
      console.error("QR generation failed:", qrError.message);
    }

    // Emit real-time notification
    try {
      emitToUser(req.user.id, "notification", {
        id: notifId,
        message: `Booking confirmed for "${event.title}" — ${quantity} ticket(s) at ${slot}`,
        type: "booking",
        isRead: false,
      });

      // Emit live seat update to everyone viewing this event
      emitToEventRoom(event.id, "seats-updated", {
        eventId: event.id,
        seatsLeft: updatedRemainingSeats,
      });
    } catch (socketError) {
      console.error("Socket emit error:", socketError.message);
    }

    // Email should not break booking success
    if (req.user?.email && config.mail.user && config.mail.pass) {
      try {
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
      } catch (emailError) {
        console.error(`❌ Booking confirmation email failed to ${req.user.email}:`, emailError.message);
      }
    }

    res.status(201).json({ booking, qrDataUrl });
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