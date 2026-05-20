const TOKEN_KEY = "eventpulse_session_token_v1";

function getStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

function decodeBase64Url(segment) {
  const normalized = segment.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
  return atob(normalized + padding);
}

export function getSessionToken() {
  const storage = getStorage();
  return storage ? storage.getItem(TOKEN_KEY) : null;
}

export function saveSessionToken(token) {
  const storage = getStorage();

  if (!storage) {
    return;
  }

  storage.setItem(TOKEN_KEY, token);
}

export function clearSessionToken() {
  const storage = getStorage();

  if (!storage) {
    return;
  }

  storage.removeItem(TOKEN_KEY);
}

export function getSessionClaims() {
  const token = getSessionToken();
  if (!token) {
    return null;
  }

  try {
    const [, payloadSegment] = token.split(".");
    if (!payloadSegment) {
      return null;
    }

    return JSON.parse(decodeBase64Url(payloadSegment));
  } catch {
    return null;
  }
}
