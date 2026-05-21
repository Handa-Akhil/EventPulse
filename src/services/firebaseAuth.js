import { getApps, initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  getAuth,
  GoogleAuthProvider,
  setPersistence,
  signInWithPopup,
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

export function getFirebaseGoogleAuthErrorMessage(error) {
  if (error?.code === "auth/popup-closed-by-user") {
    return "Google login was cancelled.";
  }

  if (error?.code === "auth/popup-blocked") {
    return "Allow popups for this site to continue with Google.";
  }

  return error?.message || "Google login failed. Please try again.";
}
