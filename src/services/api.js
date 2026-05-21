import {
  clearSessionToken,
  getSessionToken,
  saveSessionToken,
} from "./session";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";
const RETRYABLE_STATUSES = new Set([500, 502, 503, 504]);

class ApiError extends Error {
  constructor(message, { status = 0, payload = null, isNetworkError = false } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
    this.isNetworkError = isNetworkError;
  }
}

function wait(ms) {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, ms);
  });
}

async function request(path, options = {}) {
  const retryCount = Number.isInteger(options.retryCount) ? options.retryCount : 0;
  const retryDelayMs = Number.isFinite(options.retryDelayMs) ? options.retryDelayMs : 750;
  let lastError;

  for (let attempt = 0; attempt <= retryCount; attempt += 1) {
    try {
      return await sendRequest(path, options);
    } catch (error) {
      lastError = error;

      const shouldRetry =
        attempt < retryCount &&
        (error?.isNetworkError || RETRYABLE_STATUSES.has(error?.status));

      if (!shouldRetry) {
        throw error;
      }

      await wait(retryDelayMs * (attempt + 1));
    }
  }

  throw lastError;
}

async function sendRequest(path, options = {}) {
  const token = getSessionToken();
  const headers = new Headers(options.headers || {});
  const timeoutMs = Number.isFinite(options.timeoutMs) ? options.timeoutMs : 0;
  const controller = timeoutMs > 0 ? new AbortController() : null;
  const timeoutId = controller
    ? globalThis.setTimeout(() => controller.abort(), timeoutMs)
    : null;

  if (options.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method || "GET",
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      credentials: options.credentials || "same-origin",
      signal: controller?.signal,
    });
  } catch (error) {
    const message =
      error?.name === "AbortError"
        ? "The request took too long. Please check your connection and try again."
        : "Unable to reach the EventPulse API. Please try again.";

    throw new ApiError(message, {
      isNetworkError: true,
      payload: error,
    });
  } finally {
    if (timeoutId) {
      globalThis.clearTimeout(timeoutId);
    }
  }

  const contentType = response.headers.get("content-type") || "";
  let payload;

  try {
    payload = contentType.includes("application/json")
      ? await response.json()
      : await response.text();
  } catch (error) {
    console.error("Failed to parse response:", error);
    throw new ApiError("Server returned invalid response format", {
      status: response.status,
    });
  }

  if (!response.ok) {
    if (response.status === 401) {
      clearSessionToken();
    }

    const message =
      typeof payload === "object" && payload && "message" in payload
        ? payload.message
        : typeof payload === "string" && payload.trim()
          ? payload.trim()
        : `Request failed (${response.status})`;

    console.error("API Error:", { status: response.status, path, message, payload });
    throw new ApiError(message, { status: response.status, payload });
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

export async function loginWithGoogle(payload) {
  const response = await request("/auth/google", {
    method: "POST",
    body: payload,
    retryCount: 4,
    retryDelayMs: 800,
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

export async function requestPasswordResetOtp(email) {
  const response = await request("/auth/forgot-password/request", {
    method: "POST",
    body: { email },
  });

  return response;
}

export async function verifyPasswordResetOtp(email, otp) {
  const response = await request("/auth/forgot-password/verify", {
    method: "POST",
    body: { email, otp },
  });

  return response;
}

export async function resetPasswordWithOtp(payload) {
  const response = await request("/auth/forgot-password/reset", {
    method: "POST",
    body: payload,
  });

  return response;
}

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
    timeoutMs: 15000,
  });

  return response;
}

export async function fetchBookingTicket(bookingId) {
  const response = await request(`/bookings/${bookingId}/ticket`);
  return response;
}

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

export async function fetchFavoriteIds() {
  const response = await request("/favorites/ids");
  return response.favoriteIds;
}

export async function toggleFavorite(eventId) {
  const response = await request(`/favorites/${eventId}`, {
    method: "POST",
  });

  return response.favorited;
}
