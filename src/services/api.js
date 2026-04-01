import {
  clearSessionToken,
  getSessionToken,
  saveSessionToken,
} from "./session";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

async function request(path, options = {}) {
  const token = getSessionToken();
  const headers = new Headers(options.headers || {});

  if (options.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const contentType = response.headers.get("content-type") || "";
  let payload;
  
  try {
    payload = contentType.includes("application/json")
      ? await response.json()
      : await response.text();
  } catch (error) {
    console.error("Failed to parse response:", error);
    throw new Error("Server returned invalid response format");
  }

  if (!response.ok) {
    if (response.status === 401) {
      clearSessionToken();
    }

    const message =
      typeof payload === "object" && payload && "message" in payload
        ? payload.message
        : `Request failed (${response.status})`;

    console.error("API Error:", { status: response.status, path, message, payload });
    throw new Error(message);
  }

  return payload;
}

function buildQueryString(params) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    searchParams.set(key, String(value));
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}

// ──────────── AUTH ────────────

export async function registerUser(payload) {
  const response = await request("/auth/signup", {
    method: "POST",
    body: payload,
  });

  saveSessionToken(response.token);
  return response.user;
}

export async function loginUser(payload) {
  const response = await request("/auth/login", {
    method: "POST",
    body: payload,
  });

  saveSessionToken(response.token);
  return response.user;
}

export async function getSessionUser() {
  if (!getSessionToken()) {
    return null;
  }

  const response = await request("/auth/me");
  return response.user;
}

export async function logoutUser() {
  try {
    await request("/auth/logout", { method: "POST" });
  } finally {
    clearSessionToken();
  }
}

// ──────────── USER ────────────

export async function updateUserPreferences(preferences) {
  const response = await request("/users/me/preferences", {
    method: "PUT",
    body: { preferences },
  });

  return response.user;
}

export async function fetchSavedLocation() {
  const response = await request("/users/me/location");
  return response.location;
}

export async function saveUserLocation(location) {
  const response = await request("/users/me/location", {
    method: "PUT",
    body: location,
  });

  return response.location;
}

// ──────────── EVENTS ────────────

export async function fetchNearbyEvents(params) {
  const response = await request(
    `/events${buildQueryString({
      lat: params?.lat,
      lng: params?.lng,
      search: params?.search,
      category: params?.category,
      rangeKm: params?.rangeKm,
    })}`,
  );

  return response.events;
}

export async function fetchRecommendedEvents(params) {
  const response = await request(
    `/events/recommended${buildQueryString({
      lat: params?.lat,
      lng: params?.lng,
      search: params?.search,
      rangeKm: params?.rangeKm,
    })}`,
  );

  return response.events;
}

export async function fetchEventDetails(eventId, location) {
  const response = await request(
    `/events/${eventId}${buildQueryString({
      lat: location?.lat,
      lng: location?.lng,
    })}`,
  );

  return response.event;
}

export async function createUserEvent(payload) {
  const response = await request("/events", {
    method: "POST",
    body: payload,
  });

  return response;
}

// ──────────── BOOKINGS ────────────

export async function fetchUserBookings(limit = 3) {
  const response = await request(
    `/bookings${buildQueryString({
      limit,
    })}`,
  );

  return response.bookings;
}

export async function createBooking(payload) {
  const response = await request("/bookings", {
    method: "POST",
    body: payload,
  });

  return response;
}

export async function fetchBookingTicket(bookingId) {
  const response = await request(`/bookings/${bookingId}/ticket`);
  return response;
}

// ──────────── REVIEWS ────────────

export async function fetchReviews(eventId) {
  const response = await request(`/reviews/${eventId}`);
  return response;
}

export async function submitReview(payload) {
  const response = await request("/reviews", {
    method: "POST",
    body: payload,
  });
  return response.review;
}




// ──────────── NOTIFICATIONS ────────────

export async function fetchNotifications() {
  const response = await request("/notifications");
  return response;
}

export async function createNotification(payload) {
  const response = await request("/notifications", {
    method: "POST",
    body: payload,
  });
  return response;
}

export async function markNotificationRead(id) {
  await request(`/notifications/${id}/read`, { method: "PUT" });
}

export async function markAllNotificationsRead() {
  await request("/notifications/read-all", { method: "PUT" });
}