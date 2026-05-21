import { getApps, initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
};

export const isFirebaseAuthConfigured = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.appId,
);

let persistencePromise = null;
let googleProvider = null;
const REDIRECT_PENDING_KEY = "eventpulse_firebase_google_redirect_pending_v1";
// Firebase redirect results are one-shot. Cache the promise so React StrictMode
// cannot consume and discard it during the development double-mount cycle.
let redirectResultPromise = null;

function getBrowserSessionStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.sessionStorage;
}

function markRedirectPending() {
  getBrowserSessionStorage()?.setItem(REDIRECT_PENDING_KEY, "true");
}

function clearRedirectPending() {
  getBrowserSessionStorage()?.removeItem(REDIRECT_PENDING_KEY);
}

function isRedirectPending() {
  return getBrowserSessionStorage()?.getItem(REDIRECT_PENDING_KEY) === "true";
}

function getFirebaseAuth() {
  if (!isFirebaseAuthConfigured) {
    throw new Error("Firebase Google login is not configured.");
  }

  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  const auth = getAuth(app);

  persistencePromise ||= setPersistence(auth, browserLocalPersistence);

  return { auth, persistencePromise };
}

function getGoogleProvider() {
  googleProvider ||= new GoogleAuthProvider();
  googleProvider.setCustomParameters({ prompt: "select_account" });
  return googleProvider;
}

export async function signInWithFirebaseGoogle() {
  const { auth, persistencePromise } = getFirebaseAuth();

  await persistencePromise;

  const result = await signInWithPopup(auth, getGoogleProvider());

  return buildGoogleLoginResult(result.user);
}

export async function startFirebaseGoogleRedirect() {
  const { auth, persistencePromise } = getFirebaseAuth();

  await persistencePromise;
  markRedirectPending();
  await signInWithRedirect(auth, getGoogleProvider());
}

export async function getFirebaseGoogleRedirectResult() {
  const { auth, persistencePromise } = getFirebaseAuth();
  const wasRedirectPending = isRedirectPending();

  await persistencePromise;

  redirectResultPromise ||= getRedirectResult(auth);

  try {
    const result = await redirectResultPromise;

    if (result?.user) {
      return buildGoogleLoginResult(result.user);
    }

    if (!wasRedirectPending) {
      return null;
    }

    const redirectedUser = await waitForFirebaseUser(auth);
    return buildGoogleLoginResult(redirectedUser);
  } finally {
    if (wasRedirectPending) {
      clearRedirectPending();
    }
  }
}

function waitForFirebaseUser(auth, timeoutMs = 5000) {
  if (auth.currentUser) {
    return Promise.resolve(auth.currentUser);
  }

  return new Promise((resolve) => {
    let settled = false;
    let unsubscribe = () => {};

    const finish = (user) => {
      if (settled) {
        return;
      }

      settled = true;
      unsubscribe();
      resolve(user || null);
    };

    const timeoutId = globalThis.setTimeout(() => finish(null), timeoutMs);

    unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        globalThis.clearTimeout(timeoutId);
        finish(user);
      },
      () => {
        globalThis.clearTimeout(timeoutId);
        finish(null);
      },
    );
  });
}

async function buildGoogleLoginResult(user) {
  if (!user) {
    return null;
  }

  const idToken = await user.getIdToken(true);

  return {
    idToken,
    email: user.email || "",
  };
}


export function getFirebaseGoogleAuthErrorMessage(error) {
  const currentHost =
    typeof window === "undefined" ? "this domain" : window.location.hostname;

  if (error?.code === "auth/popup-closed-by-user") {
    return "Google sign-in was cancelled before Firebase returned an account. Refresh the page and try again.";
  }

  if (error?.code === "auth/popup-blocked") {
    return "Allow popups for this site to continue with Google.";
  }

  if (error?.code === "auth/unauthorized-domain") {
    return `This domain is not authorized in Firebase Authentication. Add ${currentHost} in Firebase Auth settings.`;
  }

  if (error?.code === "auth/operation-not-allowed") {
    return "Google sign-in is not enabled in Firebase Authentication.";
  }

  if (error?.code === "auth/invalid-api-key") {
    return "Firebase web app configuration is invalid. Check the VITE_FIREBASE_* values in .env.";
  }

  return error?.message || "Google login failed. Please try again.";
}
