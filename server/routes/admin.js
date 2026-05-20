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


router.get("/analytics", async (req, res, next) => {
  try {
    const pool = await getPool();

    // --- KPI Stats ---
    const [[eventsStats]] = await pool.execute(`
      SELECT
        COUNT(*) AS totalEvents,
        SUM(status = 'pending')  AS pendingEvents,
        SUM(status = 'approved') AS approvedEvents,
        SUM(status = 'rejected') AS rejectedEvents
      FROM events
    `);

    const [[bookingStats]] = await pool.execute(`
      SELECT COUNT(*) AS totalBookings, COALESCE(SUM(total), 0) AS totalRevenue
      FROM bookings
    `);

    const [[userStats]] = await pool.execute(`
      SELECT COUNT(*) AS totalUsers FROM users
    `);

    const [[reviewStats]] = await pool.execute(`
      SELECT COALESCE(ROUND(AVG(rating), 1), 0) AS avgRating FROM reviews
    `);

    // --- Monthly Revenue (last 12 months) ---
    const [revenueByMonth] = await pool.execute(`
      SELECT
        DATE_FORMAT(created_at, '%b') AS month,
        MONTH(created_at) AS monthNum,
        YEAR(created_at) AS year,
        COALESCE(SUM(total), 0) AS revenue
      FROM bookings
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
      GROUP BY year, monthNum, month
      ORDER BY year ASC, monthNum ASC
    `);

    // --- Events by Category ---
    const [eventsByCategory] = await pool.execute(`
      SELECT category, COUNT(*) AS count
      FROM events
      WHERE status = 'approved'
      GROUP BY category
      ORDER BY count DESC
      LIMIT 8
    `);

    // --- Top 5 Events by Bookings ---
    const [topEvents] = await pool.execute(`
      SELECT
        e.id, e.title, e.category, e.date_label, e.status,
        COUNT(b.id) AS bookings,
        COALESCE(SUM(b.total), 0) AS revenue
      FROM events e
      LEFT JOIN bookings b ON b.event_id = e.id
      GROUP BY e.id, e.title, e.category, e.date_label, e.status
      ORDER BY bookings DESC
      LIMIT 5
    `);

    // --- Bookings by Day of Week (last 30 days) ---
    const [bookingsByDay] = await pool.execute(`
      SELECT
        DAYNAME(created_at) AS day,
        DAYOFWEEK(created_at) AS dayNum,
        COUNT(*) AS bookings
      FROM bookings
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY dayNum, day
      ORDER BY dayNum ASC
    `);

    res.json({
      stats: {
        totalEvents:    Number(eventsStats.totalEvents)   || 0,
        pendingEvents:  Number(eventsStats.pendingEvents)  || 0,
        approvedEvents: Number(eventsStats.approvedEvents) || 0,
        rejectedEvents: Number(eventsStats.rejectedEvents) || 0,
        totalBookings:  Number(bookingStats.totalBookings) || 0,
        totalRevenue:   Number(bookingStats.totalRevenue)  || 0,
        totalUsers:     Number(userStats.totalUsers)       || 0,
        avgRating:      Number(reviewStats.avgRating)      || 0,
      },
      revenueByMonth: revenueByMonth.map(r => ({
        month:   r.month,
        revenue: Number(r.revenue) || 0,
      })),
      eventsByCategory: eventsByCategory.map(c => ({
        category: c.category,
        count:    Number(c.count) || 0,
      })),
      topEvents: topEvents.map(e => ({
        id:        e.id,
        title:     e.title,
        category:  e.category,
        dateLabel: e.date_label,
        status:    e.status,
        bookings:  Number(e.bookings)  || 0,
        revenue:   Number(e.revenue)   || 0,
      })),
      bookingsByDay: bookingsByDay.map(d => ({
        day:      d.day,
        bookings: Number(d.bookings) || 0,
      })),
    });
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