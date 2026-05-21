import { Buffer } from "node:buffer";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { config } from "../config.js";

const FIREBASE_APP_NAME = "eventpulse-firebase-auth";

let firebaseAuth = null;

function normalizePrivateKey(value) {
  return String(value || "").replace(/\\n/g, "\n");
}

function parseServiceAccount(value) {
  const rawValue = String(value || "").trim();

  if (!rawValue) {
    return null;
  }

  const jsonValue = rawValue.startsWith("{")
    ? rawValue
    : Buffer.from(rawValue, "base64").toString("utf8");

  const serviceAccount = JSON.parse(jsonValue);

  return {
    projectId: serviceAccount.project_id || serviceAccount.projectId || "",
    clientEmail: serviceAccount.client_email || serviceAccount.clientEmail || "",
    privateKey: normalizePrivateKey(serviceAccount.private_key || serviceAccount.privateKey),
  };
}

function buildFirebaseAppOptions() {
  const serviceAccount = parseServiceAccount(config.firebase?.serviceAccount);
  const projectId = serviceAccount?.projectId || config.firebase?.projectId || "";
  const clientEmail = serviceAccount?.clientEmail || config.firebase?.clientEmail || "";
  const privateKey = serviceAccount?.privateKey || config.firebase?.privateKey || "";

  if (!projectId) {
    return null;
  }

  if (clientEmail && privateKey) {
    return {
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      projectId,
    };
  }

  return { projectId };
}

export function isFirebaseAdminConfigured() {
  return Boolean(config.firebase?.projectId || config.firebase?.serviceAccount);
}

function getFirebaseAuth() {
  if (firebaseAuth) {
    return firebaseAuth;
  }

  const options = buildFirebaseAppOptions();

  if (!options) {
    throw new Error("Firebase project id is required for Google login.");
  }

  const app =
    getApps().find((firebaseApp) => firebaseApp.name === FIREBASE_APP_NAME) ||
    initializeApp(options, FIREBASE_APP_NAME);

  firebaseAuth = getAuth(app);
  return firebaseAuth;
}

export async function verifyFirebaseIdToken(idToken) {
  return getFirebaseAuth().verifyIdToken(idToken);
}
