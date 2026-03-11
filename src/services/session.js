const TOKEN_KEY = "eventpulse_session_token_v1";

function getStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
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
