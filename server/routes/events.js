import { randomUUID } from "node:crypto";
import express from "express";
import { getPool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";
import { getDistanceKm } from "../utils/distance.js";
import { serializeEvent } from "../utils/serializers.js";
import { buildEventRecord } from "../utils/eventDrafts.js";

const router = express.Router();

function getRequestedLocation(query, savedLocation) {
  const lat = Number(query.lat);
  const lng = Number(query.lng);

  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return { lat, lng };
  }

  return savedLocation || null;
}

function buildEventView(row, requestedLocation) {
  const event = serializeEvent(row);

  return {
    createdByEmail: row.created_by_email || null,
    event: {
      ...event,
      distanceKm: requestedLocation
        ? getDistanceKm(requestedLocation, event.coordinates)
        : null,
    },
  };
}

router.post("/", requireAuth, async (req, res, next) => {
  try {
    const record = buildEventRecord(req.body, {
      status: "pending",
      createdByEmail: req.user.email,
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

    res.status(201).json({
      success: true,
      message: "Event submitted for admin approval",
      eventId: id,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const pool = await getPool();
    const [rows] = await pool.execute(
      "SELECT * FROM events WHERE status = 'approved'",
    );

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

    let eventViews = rows.map((row) => buildEventView(row, requestedLocation));

    if (requestedLocation) {
      eventViews = eventViews.filter(({ createdByEmail, event }) => {
        if (createdByEmail === req.user.email) {
          return true;
        }

        if (event.distanceKm !== null && event.distanceKm <= rangeKm) {
          return true;
        }

        return (
          req.user.savedLocation?.city &&
          event.city.toLowerCase() === req.user.savedLocation.city.toLowerCase()
        );
      });
    }

    if (category !== "All") {
      eventViews = eventViews.filter(({ event }) => event.category === category);
    }

    if (search) {
      eventViews = eventViews.filter(({ event }) =>
        [event.title, event.city, event.venue, event.category]
          .join(" ")
          .toLowerCase()
          .includes(search),
      );
    }

    eventViews.sort(
      (left, right) =>
        (left.event.distanceKm ?? Number.MAX_SAFE_INTEGER) -
        (right.event.distanceKm ?? Number.MAX_SAFE_INTEGER),
    );

    res.json({ events: eventViews.map(({ event }) => event) });
  } catch (error) {
    next(error);
  }
});

router.get("/recommended", requireAuth, async (req, res, next) => {
  try {
    const pool = await getPool();
    const [rows] = await pool.execute(
      "SELECT * FROM events WHERE status = 'approved'",
    );

    const requestedLocation = getRequestedLocation(req.query, req.user.savedLocation);
    const rangeKm = Number.isFinite(Number(req.query.rangeKm))
      ? Number(req.query.rangeKm)
      : 40;

    const search =
      typeof req.query.search === "string"
        ? req.query.search.trim().toLowerCase()
        : "";

    let eventViews = rows
      .map((row) => buildEventView(row, requestedLocation))
      .filter(
        ({ createdByEmail, event }) =>
          req.user.preferences.includes(event.category) ||
          createdByEmail === req.user.email,
      );

    if (requestedLocation) {
      eventViews = eventViews.filter(({ createdByEmail, event }) => {
        if (createdByEmail === req.user.email) {
          return true;
        }

        if (event.distanceKm !== null && event.distanceKm <= rangeKm) {
          return true;
        }

        return (
          req.user.savedLocation?.city &&
          event.city.toLowerCase() === req.user.savedLocation.city.toLowerCase()
        );
      });
    }

    if (search) {
      eventViews = eventViews.filter(({ event }) =>
        [event.title, event.city, event.venue, event.category]
          .join(" ")
          .toLowerCase()
          .includes(search),
      );
    }

    eventViews.sort(
      (left, right) =>
        (left.event.distanceKm ?? Number.MAX_SAFE_INTEGER) -
        (right.event.distanceKm ?? Number.MAX_SAFE_INTEGER),
    );

    res.json({ events: eventViews.map(({ event }) => event) });
  } catch (error) {
    next(error);
  }
});

router.get("/:eventId", requireAuth, async (req, res, next) => {
  try {
    const pool = await getPool();
    const [rows] = await pool.execute(
      "SELECT * FROM events WHERE id = ? AND status = 'approved' LIMIT 1",
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
