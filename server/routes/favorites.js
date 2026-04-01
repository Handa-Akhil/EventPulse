import { sequelize } from "../db/sequelize.js";
import { QueryTypes } from "sequelize";
import fs from "fs";
import express from "express";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// GET all favorites for current user
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const rows = await sequelize.query(
      `SELECT f.id, f.event_id, f.created_at, e.title, e.category, e.city, e.venue,
              e.price, e.date_label, e.event_date, e.short_description, e.hero_gradient,
              e.remaining_seats, e.total_seats, e.latitude, e.longitude
       FROM favorites f
       JOIN events e ON f.event_id = e.id
       WHERE f.user_id = ?
       ORDER BY f.created_at DESC`,
      {
        replacements: [req.user.id],
        type: QueryTypes.SELECT,
      }
    );

    const favorites = rows.map((r) => ({
      id: r.id,
      eventId: r.event_id,
      title: r.title,
      category: r.category,
      city: r.city,
      venue: r.venue,
      price: Number(r.price),
      dateLabel: r.date_label,
      eventDate: r.event_date,
      shortDescription: r.short_description,
      heroGradient: r.hero_gradient,
      seatsLeft: r.remaining_seats !== null ? Number(r.remaining_seats) : null,
      coordinates: { lat: Number(r.latitude), lng: Number(r.longitude) },
      createdAt: r.created_at,
    }));

    res.json({ favorites });
  } catch (error) {
    console.error("GET Favorites Error:", error);
    next(error);
  }
});

// GET favorite IDs only (for quick lookup)
router.get("/ids", requireAuth, async (req, res, next) => {
  try {
    const rows = await sequelize.query(
      "SELECT event_id FROM favorites WHERE user_id = ?",
      {
        replacements: [req.user.id],
        type: QueryTypes.SELECT,
      }
    );
    res.json({ favoriteIds: rows.map((r) => r.event_id) });
  } catch (error) {
    next(error);
  }
});

// POST toggle favorite
router.post("/:eventId", requireAuth, async (req, res, next) => {
  const eventId = req.params.eventId;
  const userId = req.user?.id;

  try {
    // Check if already favorited
    const existing = await sequelize.query(
      "SELECT id FROM favorites WHERE user_id = ? AND event_id = ? LIMIT 1",
      {
        replacements: [userId, eventId],
        type: QueryTypes.SELECT,
      }
    );

    if (existing && existing.length > 0) {
      // Remove favorite
      await sequelize.query(
        "DELETE FROM favorites WHERE user_id = ? AND event_id = ?",
        {
          replacements: [userId, eventId],
          type: QueryTypes.DELETE,
        }
      );
      return res.json({ favorited: false });
    }

    // Check event existence to respect foreign key
    const eventRow = await sequelize.query(
      "SELECT id FROM events WHERE id = ? LIMIT 1",
      {
        replacements: [eventId],
        type: QueryTypes.SELECT,
      }
    );
    if (!eventRow || eventRow.length === 0) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Add favorite
    const id = Date.now().toString(36) + Math.random().toString(36).substring(2, 11);
    await sequelize.query(
      "INSERT INTO favorites (id, user_id, event_id) VALUES (?, ?, ?)",
      {
        replacements: [id, userId, eventId],
        type: QueryTypes.INSERT,
      }
    );

    // Create notification
    try {
      const notifId = Date.now().toString(36) + Math.random().toString(36).substring(2, 11);
      await sequelize.query(
        "INSERT INTO notifications (id, user_id, message, type) VALUES (?, ?, ?, ?)",
        {
          replacements: [notifId, userId, "Event added to wishlist!", "info"],
          type: QueryTypes.INSERT,
        }
      );
    } catch (err) {
      // Just log notification error, don't 500
    }

    res.status(201).json({ favorited: true });
  } catch (error) {
    const logMsg = `[${new Date().toISOString()}] Toggle Favorite Error: ${error.message}\n` +
                   `  User: ${userId}, Event: ${eventId}\n` +
                   `  Stack: ${error.stack}\n\n`;
    fs.appendFileSync("debug-favorites-sequelize.log", logMsg);
    next(error);
  }
});


export default router;
