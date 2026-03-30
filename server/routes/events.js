import express from "express";
import { getPool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";
import { getDistanceKm } from "../utils/distance.js";
import { serializeEvent } from "../utils/serializers.js";
import { randomUUID } from "crypto";

const router = express.Router();

function getRequestedLocation(query, savedLocation) {
  const lat = Number(query.lat);
  const lng = Number(query.lng);

  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return { lat, lng };
  }

  return savedLocation || null;
}


router.post("/", requireAuth, async (req, res, next) => {
  try {
    const {
      title,
      category,
      city,
      venue,
      price,
      totalSeats,
      dateLabel,
      duration,
      language,
      audience,
      shortDescription,
      description,
      showtimes, 
      highlights, 
    } = req.body;

    const id = randomUUID();
    const lat = 0; 
    const lng = 0;
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
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, NOW(), NOW()
      )`,
      [
        id,
        title || "Untitled Event",
        category || "Other",
        city || "Unknown",
        venue || "Unknown Venue",
        lat,
        lng,
        Number(price) || 0,
        Number(totalSeats) || 100,
        Number(totalSeats) || 100, 
        dateLabel || defaultDate.toLocaleDateString(),
        duration || "2h",
        language || "English",
        audience || "Family",
        gradient,
        shortDescription || "Exciting new event.",
        description || "Detailed event description coming soon.",
        JSON.stringify(highlights || ["Great experience", "Fun for everyone"]),
        JSON.stringify(showtimes || ["7:00 PM"]),
        req.user.email,
      ]
    );

    res.status(201).json({ success: true, message: "Event submitted for admin approval", eventId: id });
  } catch (error) {
    next(error);
  }
});


router.get("/", requireAuth, async (req, res, next) => {
  try {
    const pool = await getPool();

    
    const [rows] = await pool.execute(
      "SELECT * FROM events WHERE status = 'approved'"
    );

    const requestedLocation = getRequestedLocation(
      req.query,
      req.user.savedLocation
    );

    const rangeKm = Number.isFinite(Number(req.query.rangeKm))
      ? Number(req.query.rangeKm)
      : 40;

    const category =
      typeof req.query.category === "string" &&
      req.query.category !== "All"
        ? req.query.category
        : "All";

    const search =
      typeof req.query.search === "string"
        ? req.query.search.trim().toLowerCase()
        : "";

    let events = rows
      .map((row) => serializeEvent(row))
      .map((event) => ({
        ...event,
        distanceKm: requestedLocation
          ? getDistanceKm(requestedLocation, event.coordinates)
          : null,
      }));

    if (requestedLocation) {
      events = events.filter(
        (event) =>
          event.created_by_email === req.user.email ||
          (event.distanceKm !== null && event.distanceKm <= rangeKm) ||
          (req.user.savedLocation?.city && event.city.toLowerCase() === req.user.savedLocation.city.toLowerCase())
      );
    }

    if (category !== "All") {
      events = events.filter((event) => event.category === category);
    }

    if (search) {
      events = events.filter((event) =>
        [event.title, event.city, event.venue, event.category]
          .join(" ")
          .toLowerCase()
          .includes(search)
      );
    }

    events.sort(
      (left, right) =>
        (left.distanceKm ?? Number.MAX_SAFE_INTEGER) -
        (right.distanceKm ?? Number.MAX_SAFE_INTEGER)
    );

    res.json({ events });
  } catch (error) {
    next(error);
  }
});


router.get("/recommended", requireAuth, async (req, res, next) => {
  try {
    const pool = await getPool();

    const [rows] = await pool.execute(
      "SELECT * FROM events WHERE status = 'approved'"
    );

    const requestedLocation = getRequestedLocation(
      req.query,
      req.user.savedLocation
    );

    const rangeKm = Number.isFinite(Number(req.query.rangeKm))
      ? Number(req.query.rangeKm)
      : 40;

    const search =
      typeof req.query.search === "string"
        ? req.query.search.trim().toLowerCase()
        : "";

    let events = rows
      .map((row) => serializeEvent(row))
      .filter((event) => req.user.preferences.includes(event.category) || event.created_by_email === req.user.email)
      .map((event) => ({
        ...event,
        distanceKm: requestedLocation
          ? getDistanceKm(requestedLocation, event.coordinates)
          : null,
      }));

    if (requestedLocation) {
      events = events.filter(
        (event) =>
          event.created_by_email === req.user.email ||
          (event.distanceKm !== null && event.distanceKm <= rangeKm) ||
          (req.user.savedLocation?.city && event.city.toLowerCase() === req.user.savedLocation.city.toLowerCase())
      );
    }

    if (search) {
      events = events.filter((event) =>
        [event.title, event.city, event.venue, event.category]
          .join(" ")
          .toLowerCase()
          .includes(search)
      );
    }

    events.sort(
      (left, right) =>
        (left.distanceKm ?? Number.MAX_SAFE_INTEGER) -
        (right.distanceKm ?? Number.MAX_SAFE_INTEGER)
    );

    res.json({ events });
  } catch (error) {
    next(error);
  }
});


router.get("/:eventId", requireAuth, async (req, res, next) => {
  try {
    const pool = await getPool();


    const [rows] = await pool.execute(
      "SELECT * FROM events WHERE id = ? AND status = 'approved' LIMIT 1",
      [req.params.eventId]
    );

    if (rows.length === 0) {
      res.status(404).json({ message: "Event not found." });
      return;
    }

    const requestedLocation = getRequestedLocation(
      req.query,
      req.user.savedLocation
    );

    const event = serializeEvent(rows[0]);

    res.json({
      event: {
        ...event,
        distanceKm: requestedLocation
          ? getDistanceKm(requestedLocation, event.coordinates)
          : null,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;