import { randomUUID } from "node:crypto";
import express from "express";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { config } from "../config.js";
import { getPool } from "../db/pool.js";
import { createAdminToken, requireAdminAuth } from "../middleware/auth.js";
import { sendEmail } from "../services/emailService.js";
import { buildEventRecord } from "../utils/eventDrafts.js";

const router = express.Router();

const adminLoginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: config.isProduction ? 10 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many admin login attempts. Please try again later.",
  },
});

async function isValidAdminPassword(password) {
  if (config.adminAuth.passwordHash) {
    return bcrypt.compare(password, config.adminAuth.passwordHash);
  }

  return Boolean(config.adminAuth.password) && password === config.adminAuth.password;
}

router.post("/login", adminLoginLimiter, async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");

  if (!email || !password) {
    res.status(400).json({
      success: false,
      message: "Admin email and password are required.",
    });
    return;
  }

  const expectedEmail = config.adminAuth.email.toLowerCase();
  const passwordMatches = await isValidAdminPassword(password);

  if (email !== expectedEmail || !passwordMatches) {
    res.status(401).json({
      success: false,
      message: "Invalid credentials",
    });
    return;
  }

  const token = createAdminToken(config.adminAuth.email);

  res.json({
    success: true,
    message: "Admin login successful",
    token,
    admin: {
      email: config.adminAuth.email,
      name: config.adminAuth.name,
    },
  });
});

router.use(requireAdminAuth);

router.get("/session", (req, res) => {
  res.json({ admin: req.admin });
});

router.post("/logout", (req, res) => {
  res.status(204).end();
});

router.get("/pending-events", async (req, res, next) => {
  try {
    const pool = await getPool();
    const [rows] = await pool.execute(
      "SELECT * FROM events WHERE status = 'pending' ORDER BY created_at DESC",
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
      "SELECT * FROM events ORDER BY created_at DESC",
    );

    res.json({ events: rows });
  } catch (error) {
    next(error);
  }
});

router.post("/approve/:id", async (req, res, next) => {
  try {
    const pool = await getPool();
    const [rows] = await pool.execute(
      "SELECT * FROM events WHERE id = ? LIMIT 1",
      [req.params.id],
    );

    if (rows.length === 0) {
      res.status(404).json({ message: "Event not found" });
      return;
    }

    const event = rows[0];

    await pool.execute(
      "UPDATE events SET status = 'approved', updated_at = NOW() WHERE id = ?",
      [req.params.id],
    );

    if (event.created_by_email) {
      try {
        await sendEmail(
          event.created_by_email,
          "Your Event Has Been Approved",
          `Great news. Your event "${event.title}" has been approved and is now live on EventPulse.`,
        );
      } catch (emailError) {
        console.error(
          `Failed to send approval email to ${event.created_by_email}:`,
          emailError.message,
        );
      }
    }

    res.json({ message: "Event approved successfully" });
  } catch (error) {
    next(error);
  }
});

router.post("/reject/:id", async (req, res, next) => {
  try {
    const reason = String(req.body?.reason || "").trim();
    const pool = await getPool();
    const [rows] = await pool.execute(
      "SELECT * FROM events WHERE id = ? LIMIT 1",
      [req.params.id],
    );

    if (rows.length === 0) {
      res.status(404).json({ message: "Event not found" });
      return;
    }

    const event = rows[0];

    await pool.execute(
      "UPDATE events SET status = 'rejected', updated_at = NOW() WHERE id = ?",
      [req.params.id],
    );

    if (event.created_by_email) {
      try {
        await sendEmail(
          event.created_by_email,
          "Update on Your Event Submission",
          `Your event "${event.title}" was not approved.${reason ? ` Reason: ${reason}` : ""}`,
        );
      } catch (emailError) {
        console.error(
          `Failed to send rejection email to ${event.created_by_email}:`,
          emailError.message,
        );
      }
    }

    res.json({ message: "Event rejected successfully" });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const record = buildEventRecord(req.body, {
      status: "approved",
      createdByEmail: req.admin.email,
    });

    const id = randomUUID();
    const pool = await getPool();

    await pool.execute(
      `INSERT INTO events (
        id,
        title,
        category,
        city,
        venue,
        latitude,
        longitude,
        price,
        total_seats,
        remaining_seats,
        event_date,
        date_label,
        duration,
        language,
        audience,
        hero_gradient,
        short_description,
        description,
        highlights_json,
        showtimes_json,
        status,
        created_by_email,
        created_at,
        updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW()
      )`,
      [
        id,
        record.title,
        record.category,
        record.city,
        record.venue,
        record.latitude,
        record.longitude,
        record.price,
        record.totalSeats,
        record.remainingSeats,
        record.eventDate,
        record.dateLabel,
        record.duration,
        record.language,
        record.audience,
        record.heroGradient,
        record.shortDescription,
        record.description,
        JSON.stringify(record.highlights),
        JSON.stringify(record.showtimes),
        record.status,
        record.createdByEmail,
      ],
    );

    res.status(201).json({ message: "Event manually added successfully", id });
  } catch (error) {
    next(error);
  }
});

router.get("/analytics", async (req, res, next) => {
  try {
    const pool = await getPool();

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

    const [eventsByCategory] = await pool.execute(`
      SELECT category, COUNT(*) AS count
      FROM events
      WHERE status = 'approved'
      GROUP BY category
      ORDER BY count DESC
      LIMIT 8
    `);

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
        totalEvents: Number(eventsStats.totalEvents) || 0,
        pendingEvents: Number(eventsStats.pendingEvents) || 0,
        approvedEvents: Number(eventsStats.approvedEvents) || 0,
        rejectedEvents: Number(eventsStats.rejectedEvents) || 0,
        totalBookings: Number(bookingStats.totalBookings) || 0,
        totalRevenue: Number(bookingStats.totalRevenue) || 0,
        totalUsers: Number(userStats.totalUsers) || 0,
        avgRating: Number(reviewStats.avgRating) || 0,
      },
      revenueByMonth: revenueByMonth.map((row) => ({
        month: row.month,
        revenue: Number(row.revenue) || 0,
      })),
      eventsByCategory: eventsByCategory.map((row) => ({
        category: row.category,
        count: Number(row.count) || 0,
      })),
      topEvents: topEvents.map((row) => ({
        id: row.id,
        title: row.title,
        category: row.category,
        dateLabel: row.date_label,
        status: row.status,
        bookings: Number(row.bookings) || 0,
        revenue: Number(row.revenue) || 0,
      })),
      bookingsByDay: bookingsByDay.map((row) => ({
        day: row.day,
        bookings: Number(row.bookings) || 0,
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
