import {
  clearAdminSessionToken,
  getAdminSessionToken,
  saveAdminSessionToken,
} from "./adminSession";

const BASE_URL = `${import.meta.env.VITE_API_BASE_URL || "/api"}/admin`;

async function adminRequest(path = "", options = {}) {
  const token = getAdminSessionToken();
  const headers = new Headers(options.headers || {});

  if (options.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token && options.includeAuth !== false) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    if (response.status === 401) {
      clearAdminSessionToken();
    }

    const message =
      typeof payload === "object" && payload && "message" in payload
        ? payload.message
        : `Request failed (${response.status})`;

    throw new Error(message);
  }

  return payload;
}

export async function loginAdmin(email, password) {
  const response = await adminRequest("/login", {
    method: "POST",
    body: { email, password },
    includeAuth: false,
  });

  if (response.token) {
    saveAdminSessionToken(response.token);
  }

  return response;
}

export async function logoutAdmin() {
  try {
    if (getAdminSessionToken()) {
      await adminRequest("/logout", { method: "POST" });
    }
  } finally {
    clearAdminSessionToken();
  }
}

export function isAdminSessionActive() {
  return Boolean(getAdminSessionToken());
}

export async function getAdminSession() {
  return adminRequest("/session");
}

export async function getPendingEvents() {
  return adminRequest("/pending-events");
}

export async function approveEvent(id) {
  return adminRequest(`/approve/${id}`, {
    method: "POST",
  });
}

export async function rejectEvent(id, reason) {
  return adminRequest(`/reject/${id}`, {
    method: "POST",
    body: { reason },
  });
}

export async function getAllEvents() {
  return adminRequest("/all-events");
}

export async function addEventManual(payload) {
  return adminRequest("", {
    method: "POST",
    body: payload,
  });
}

export async function getAnalytics() {
  return adminRequest("/analytics");
}

export async function deleteEvent(id) {
  return adminRequest(`/${id}`, {
    method: "DELETE",
  });
}
