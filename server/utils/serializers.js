function parseJson(value, fallbackValue) {
  if (!value) {
    return fallbackValue;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallbackValue;
  }
}

export function serializeUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    preferences: parseJson(row.preferences_json, []),
    savedLocation: parseJson(row.saved_location_json, null),
    hasOnboarded: Boolean(row.has_onboarded),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function serializeEvent(row) {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    city: row.city,
    venue: row.venue,
    coordinates: {
      lat: Number(row.latitude),
      lng: Number(row.longitude),
    },
    price: Number(row.price),
    dateLabel: row.date_label,
    duration: row.duration,
    language: row.language,
    audience: row.audience,
    heroGradient: row.hero_gradient,
    imageUrl: row.image_url || "",
    shortDescription: row.short_description,
    description: row.description,
    highlights: parseJson(row.highlights_json, []),
    showtimes: parseJson(row.showtimes_json, []),
  };
}

export function serializeBooking(row) {
  return {
    id: row.id,
    eventId: row.event_id,
    title: row.title,
    venue: row.venue,
    dateLabel: row.date_label,
    slot: row.slot,
    quantity: Number(row.quantity),
    total: Number(row.total),
    createdAt: row.created_at,
  };
}
