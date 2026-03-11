import express from "express";
import { getPool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";
import { getDistanceKm } from "../utils/distance.js";
import { serializeEvent } from "../utils/serializers.js";

const router = express.Router();

function getRequestedLocation(query, savedLocation) {
  const lat = Number(query.lat);
  const lng = Number(query.lng);

  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return { lat, lng };
  }

  return savedLocation || null;
}

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const pool = await getPool();
    const [rows] = await pool.execute("SELECT * FROM events");
    const requestedLocation = getRequestedLocation(req.query, req.user.savedLocation);
    const rangeKm = Number.isFinite(Number(req.query.rangeKm))
      ? Number(req.query.rangeKm)
      : 40;
    const category =
      typeof req.query.category === "string" && req.query.category !== "All"
        ? req.query.category
        : "All";
    const search =
      typeof req.query.search === "string"
        ? req.query.search.trim().toLowerCase()
        : "";

    let events = rows
      .map((row) => serializeEvent(row))
      .filter((event) => req.user.preferences.includes(event.category))
      .map((event) => ({
        ...event,
        distanceKm: requestedLocation
          ? getDistanceKm(requestedLocation, event.coordinates)
          : null,
      }));

    if (requestedLocation) {
      events = events.filter(
        (event) => event.distanceKm !== null && event.distanceKm <= rangeKm,
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
          .includes(search),
      );
    }

    events.sort(
      (left, right) =>
        (left.distanceKm ?? Number.MAX_SAFE_INTEGER) -
        (right.distanceKm ?? Number.MAX_SAFE_INTEGER),
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
      "SELECT * FROM events WHERE id = ? LIMIT 1",
      [req.params.eventId],
    );

    if (rows.length === 0) {
      res.status(404).json({ message: "Event not found." });
      return;
    }

    const requestedLocation = getRequestedLocation(req.query, req.user.savedLocation);
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
