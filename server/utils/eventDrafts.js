import { CITY_OPTIONS } from "../../src/data/events.js";

const DEFAULT_HERO_GRADIENT = "linear-gradient(45deg, #FF6B6B, #FF8E53)";
const DEFAULT_SHOWTIMES = ["7:00 PM"];
const DEFAULT_HIGHLIGHTS = ["Great experience", "Fun for everyone"];

const cityLookup = new Map(
  CITY_OPTIONS.map((city) => [city.city.toLowerCase(), city]),
);

function normalizeText(value, fallbackValue) {
  const normalized = String(value || "").trim();
  return normalized || fallbackValue;
}

function normalizePositiveInteger(value, fallbackValue) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallbackValue;
}

function normalizeNonNegativeInteger(value, fallbackValue) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallbackValue;
}

function normalizeStringArray(value, fallbackValues) {
  const source = Array.isArray(value) ? value : fallbackValues;
  const normalized = source
    .map((item) => String(item || "").trim())
    .filter(Boolean);

  return normalized.length > 0 ? [...new Set(normalized)] : fallbackValues;
}

function normalizeCoordinate(value, fallbackValue) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallbackValue;
}

function normalizeEventDate(value) {
  const rawValue = String(value || "").trim();
  if (!rawValue) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(rawValue)) {
    return `${rawValue} 00:00:00`;
  }

  const parsed = new Date(rawValue);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().slice(0, 19).replace("T", " ");
}

function formatDateLabel(eventDate) {
  if (!eventDate) {
    return new Date().toLocaleDateString("en-US", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  const parsed = new Date(eventDate.replace(" ", "T"));
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toLocaleDateString("en-US", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  return parsed.toLocaleDateString("en-US", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function buildEventRecord(payload, options = {}) {
  const cityName = normalizeText(payload?.city, "Unknown");
  const cityDetails = cityLookup.get(cityName.toLowerCase()) || null;
  const totalSeats = normalizePositiveInteger(payload?.totalSeats, 100);
  const eventDate = normalizeEventDate(payload?.eventDate);
  const shortDescription = normalizeText(
    payload?.shortDescription,
    "Exciting new event.",
  );

  return {
    title: normalizeText(payload?.title, "Untitled Event"),
    category: normalizeText(payload?.category, "Other"),
    city: cityName,
    venue: normalizeText(payload?.venue, "Unknown Venue"),
    latitude: normalizeCoordinate(payload?.lat, cityDetails?.lat ?? 0),
    longitude: normalizeCoordinate(payload?.lng, cityDetails?.lng ?? 0),
    price: normalizeNonNegativeInteger(payload?.price, 0),
    totalSeats,
    remainingSeats: totalSeats,
    eventDate,
    dateLabel: normalizeText(payload?.dateLabel, formatDateLabel(eventDate)),
    duration: normalizeText(payload?.duration, "2h"),
    language: normalizeText(payload?.language, "English"),
    audience: normalizeText(payload?.audience, "Family"),
    heroGradient: DEFAULT_HERO_GRADIENT,
    shortDescription,
    description: normalizeText(payload?.description, shortDescription),
    highlights: normalizeStringArray(payload?.highlights, DEFAULT_HIGHLIGHTS),
    showtimes: normalizeStringArray(payload?.showtimes, DEFAULT_SHOWTIMES),
    status: options.status || "pending",
    createdByEmail: options.createdByEmail || null,
  };
}
