
// // function parseJson(value, fallbackValue) {
// //   if (!value) {
// //     return fallbackValue;
// //   }

// //   try {
// //     return JSON.parse(value);
// //   } catch {
// //     return fallbackValue;
// //   }
// // }

// // export function serializeUser(row) {
// //   return {
// //     id: row.id,
// //     name: row.name,
// //     email: row.email,
// //     preferences: parseJson(row.preferences_json, []),
// //     savedLocation: parseJson(row.saved_location_json, null),
// //     hasOnboarded: Boolean(row.has_onboarded),
// //     createdAt: row.created_at,
// //     updatedAt: row.updated_at,
// //   };
// // }

// // export function serializeEvent(row) {
// //   const totalSeats =
// //     row.total_seats !== undefined && row.total_seats !== null
// //       ? Number(row.total_seats)
// //       : null;

// //   const remainingSeats =
// //     row.remaining_seats !== undefined && row.remaining_seats !== null
// //       ? Number(row.remaining_seats)
// //       : null;

// //   return {
// //     id: row.id,
// //     title: row.title,
// //     category: row.category,
// //     city: row.city,
// //     venue: row.venue,
// //     coordinates: {
// //       lat: Number(row.latitude),
// //       lng: Number(row.longitude),
// //     },
// //     price: Number(row.price),
// //     seatCapacity: totalSeats,
// //     seatsLeft: remainingSeats,
// //     dateLabel: row.date_label,
// //     duration: row.duration,
// //     language: row.language,
// //     audience: row.audience,
// //     heroGradient: row.hero_gradient,
// //     shortDescription: row.short_description,
// //     description: row.description,
// //     highlights: parseJson(row.highlights_json, []),
// //     showtimes: parseJson(row.showtimes_json, []),
// //   };
// // }

// // export function serializeBooking(row) {
// //   return {
// //     id: row.id,
// //     eventId: row.event_id,
// //     title: row.title,
// //     venue: row.venue,
// //     dateLabel: row.date_label,
// //     slot: row.slot,
// //     quantity: Number(row.quantity),
// //     total: Number(row.total),
// //     createdAt: row.created_at,
// //   };
// // }
// function parseJson(value, fallbackValue) {
//   if (!value) {
//     return fallbackValue;
//   }

//   try {
//     return JSON.parse(value);
//   } catch {
//     return fallbackValue;
//   }
// }

// function toIsoDateTime(value) {
//   if (!value) {
//     return null;
//   }

//   const parsed = new Date(value);
//   return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
// }

// export function serializeUser(row) {
//   return {
//     id: row.id,
//     name: row.name,
//     email: row.email,
//     preferences: parseJson(row.preferences_json, []),
//     savedLocation: parseJson(row.saved_location_json, null),
//     hasOnboarded: Boolean(row.has_onboarded),
//     createdAt: row.created_at,
//     updatedAt: row.updated_at,
//   };
// }

// export function serializeEvent(row) {
//   const totalSeats =
//     row.total_seats !== undefined && row.total_seats !== null
//       ? Number(row.total_seats)
//       : null;

//   const remainingSeats =
//     row.remaining_seats !== undefined && row.remaining_seats !== null
//       ? Number(row.remaining_seats)
//       : null;

//   return {
//     id: row.id,
//     title: row.title,
//     category: row.category,
//     city: row.city,
//     venue: row.venue,
//     coordinates: {
//       lat: Number(row.latitude),
//       lng: Number(row.longitude),
//     },
//     price: Number(row.price),
//     seatCapacity: totalSeats,
//     seatsLeft: remainingSeats,
//     eventDate: toIsoDateTime(row.event_date),
//     dateLabel: row.date_label,
//     duration: row.duration,
//     language: row.language,
//     audience: row.audience,
//     heroGradient: row.hero_gradient,
//     shortDescription: row.short_description,
//     description: row.description,
//     highlights: parseJson(row.highlights_json, []),
//     showtimes: parseJson(row.showtimes_json, []),
//   };
// }


// export function serializeBooking(row) {
//   return {
//     id: row.id,
//     eventId: row.event_id,
//     title: row.title,
//     venue: row.venue,
//     dateLabel: row.date_label,
//     slot: row.slot,
//     quantity: Number(row.quantity),
//     total: Number(row.total),
//     createdAt: row.created_at,
//   };
// }
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

function toIsoDateTime(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
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
  const totalSeats =
    row.total_seats !== undefined && row.total_seats !== null
      ? Number(row.total_seats)
      : null;

  const remainingSeats =
    row.remaining_seats !== undefined && row.remaining_seats !== null
      ? Number(row.remaining_seats)
      : null;

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
    seatCapacity: totalSeats,
    seatsLeft: remainingSeats,
    eventDate: toIsoDateTime(row.event_date),
    dateLabel: row.date_label,
    duration: row.duration,
    language: row.language,
    audience: row.audience,
    heroGradient: row.hero_gradient,
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