const ADMIN_TOKEN_KEY = "eventpulse_admin_session_token_v1";

function getStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

export function getAdminSessionToken() {
  const storage = getStorage();
  return storage ? storage.getItem(ADMIN_TOKEN_KEY) : null;
}

export function saveAdminSessionToken(token) {
  const storage = getStorage();

  if (!storage) {
    return;
  }

  storage.setItem(ADMIN_TOKEN_KEY, token);
}

export function clearAdminSessionToken() {
  const storage = getStorage();

  if (!storage) {
    return;
  }

  storage.removeItem(ADMIN_TOKEN_KEY);
}
