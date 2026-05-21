import { getApps, initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
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
// Firebase redirect results are one-shot. Cache the promise so React StrictMode
// cannot consume and discard it during the development double-mount cycle.
let redirectResultPromise = null;

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
  const idToken = await result.user.getIdToken();

  return {
    idToken,
    email: result.user.email || "",
  };
}

export async function startFirebaseGoogleRedirect() {
  const { auth, persistencePromise } = getFirebaseAuth();

  await persistencePromise;
  await signInWithRedirect(auth, getGoogleProvider());
}

export async function getFirebaseGoogleRedirectResult() {
  const { auth, persistencePromise } = getFirebaseAuth();

  await persistencePromise;

  redirectResultPromise ||= getRedirectResult(auth);

  const result = await redirectResultPromise;

  if (!result?.user) {
    return null;
  }

  const idToken = await result.user.getIdToken();

  return {
    idToken,
    email: result.user.email || "",
  };
}

export function getFirebaseGoogleAuthErrorMessage(error) {
  if (error?.code === "auth/popup-closed-by-user") {
    return "Google login did not finish. Please try again.";
  }

  if (error?.code === "auth/popup-blocked") {
    return "Allow popups for this site to continue with Google.";
  }

  if (error?.code === "auth/unauthorized-domain") {
    return "This domain is not authorized in Firebase Authentication. Add localhost and 127.0.0.1 in Firebase Auth settings.";
  }

  if (error?.code === "auth/operation-not-allowed") {
    return "Google sign-in is not enabled in Firebase Authentication.";
  }

  if (error?.code === "auth/invalid-api-key") {
    return "Firebase web app configuration is invalid. Check the VITE_FIREBASE_* values in .env.";
  }

  return error?.message || "Google login failed. Please try again.";
}
