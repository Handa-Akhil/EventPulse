import express from "express";
import { getPool } from "../db/pool.js";
import { sendEmail } from "../services/emailService.js";
import { randomUUID } from "crypto";

const router = express.Router();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "akhilhanda855@gmail.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";


router.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    return res.json({
      success: true,
      message: "Admin login successful",
    });
  }

  res.status(401).json({
    success: false,
    message: "Invalid credentials",
  });
});


router.get("/pending-events", async (req, res, next) => {
  try {
    const pool = await getPool();

    const [rows] = await pool.execute(
      "SELECT * FROM events WHERE status = 'pending' ORDER BY created_at DESC"
    );

    res.json({ events: rows });
  } catch (error) {
    next(error);
  }
});


router.get("/all-events", async (req, res, next) => {
  try {
    const pool = await getPool();

    const [rows] = await pool.execute(
      "SELECT * FROM events ORDER BY created_at DESC"
    );

    res.json({ events: rows });
  } catch (error) {
    next(error);
  }
});


router.post("/approve/:id", async (req, res, next) => {
  try {
    const pool = await getPool();

   
    const [rows] = await pool.execute("SELECT * FROM events WHERE id = ?", [req.params.id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ message: "Event not found" });
    }

    const event = rows[0];

    
    await pool.execute(
      "UPDATE events SET status = 'approved', updated_at = NOW() WHERE id = ?",
      [req.params.id]
    );

    if (event.created_by_email) {
      try {
        await sendEmail(
          event.created_by_email,
          "Your Event has been Approved!",
          `Great news! Your event "${event.title}" has been approved and is now live on EventPulse.`
        );
      } catch (emailError) {
        console.error(`⚠️  Email notification failed for ${event.created_by_email}:`, emailError.message);
        // Don't fail the approval - email is non-critical
      }
    }

    res.json({ message: "Event approved successfully" });
  } catch (error) {
    next(error);
  }
});


router.post("/reject/:id", async (req, res, next) => {
  try {
    const { reason } = req.body;
    const pool = await getPool();

    const [rows] = await pool.execute(
      "SELECT * FROM events WHERE id = ?",
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Event not found" });
    }

    const event = rows[0];

    await pool.execute(
      "UPDATE events SET status = 'rejected', updated_at = NOW() WHERE id = ?",
      [req.params.id]
    );

    if (event.created_by_email) {
      try {
        await sendEmail(
          event.created_by_email,
          "Update regarding your Event Submission",
          `Hi there, your event "${event.title}" was not approved. \n\nReason: ${reason || "No reason provided."}\n\nPlease update your event details or contact support.`
        );
      } catch (emailError) {
        console.error(`⚠️  Email notification failed for ${event.created_by_email}:`, emailError.message);
        // Don't fail the rejection - email is non-critical
      }
    }

    console.log(`Rejected Event ${req.params.id}: ${reason}`);

    res.json({ message: "Event rejected successfully" });
  } catch (error) {
    next(error);
  }
});


router.post("/", async (req, res, next) => {
  try {
    const {
      title, category, city, venue, price, totalSeats,
      dateLabel, duration, language, audience,
      shortDescription, description, showtimes, highlights,
    } = req.body;

    const id = randomUUID();
    const gradient = "linear-gradient(45deg, #FF6B6B, #FF8E53)";
    const defaultDate = new Date();

    const pool = await getPool();
    await pool.execute(
      `INSERT INTO events (
        id, title, category, city, venue, latitude, longitude, price, 
        total_seats, remaining_seats, event_date, date_label, duration, 
        language, audience, hero_gradient, short_description, description, 
        highlights_json, showtimes_json, status, created_by_email, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', 'admin@eventpulse.com', NOW(), NOW()
      )`,
      [
        id, title || "Admin Event", category || "Other", city || "Unknown",
        venue || "Unknown Venue", 0, 0, Number(price) || 0,
        Number(totalSeats) || 100, Number(totalSeats) || 100,
        dateLabel || defaultDate.toLocaleDateString(), duration || "2h",
        language || "English", audience || "Family", gradient,
        shortDescription || "Exciting new event.", description || "Detailed event description.",
        JSON.stringify(highlights || []), JSON.stringify(showtimes || ["7:00 PM"])
      ]
    );

    res.status(201).json({ message: "Event manually added successfully", id });
  } catch (error) {
    next(error);
  }
});


router.delete("/:id", async (req, res, next) => {
  try {
    const pool = await getPool();
    await pool.execute("DELETE FROM events WHERE id = ?", [req.params.id]);
    res.json({ message: "Event deleted successfully" });
  } catch (error) {
    next(error);
  }
});

export default router;