# EventPulse Deployment Guide

## What changed

- The backend now reads TiDB Cloud credentials from environment variables instead of hardcoded local MySQL settings.
- The app bootstraps its schema through `npm run db:bootstrap`.
- Render can deploy the API and the built React frontend as a single Node web service.
- Admin routes now require a real JWT-based admin session instead of a client-only `localStorage` flag.
- Socket connections now authenticate with the signed-in user token before subscribing to live event rooms.

## TiDB Cloud setup

1. Use a dedicated application schema, not `sys`.
2. Set `TIDB_DB_NAME=eventpulse`.
3. Keep `DB_CREATE_IF_MISSING=true` for the first bootstrap if your TiDB user can create databases.
4. Keep `TIDB_ENABLE_SSL=true`.
5. If your TiDB tier requires a CA certificate, provide either:
   - `TIDB_CA_PATH` with a file path on disk
   - `TIDB_CA_CERT` with the PEM contents

## Render setup

1. Create a new Web Service from this repo.
2. Use the included `render.yaml`, or mirror these values manually:
   - Build Command: `npm install --include=dev && npm run build`
   - Pre-Deploy Command: `npm run db:bootstrap`
   - Start Command: `npm start`
   - Health Check Path: `/api/health`
3. Add the required environment variables from `.env.example`.
4. Set `PUBLIC_APP_URL` to your Render URL.
5. Set `CLIENT_ORIGINS` to your Render URL. Add local dev origins only outside production.
6. Set strong values for `AUTH_SECRET` and `ADMIN_AUTH_SECRET`.
7. Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` to your real admin credentials.
8. For Google login, set every `VITE_FIREBASE_*` variable in Render before the build runs, then redeploy. Vite embeds these values into the client bundle at build time.
9. In Firebase Console, open Authentication -> Settings -> Authorized domains and add your Render host, for example `eventpulse.onrender.com`. Add only the host name, not `https://`.
10. In Firebase Console, open Authentication -> Sign-in method and make sure Google is enabled.
11. Set either `FIREBASE_SERVICE_ACCOUNT` or `FIREBASE_SERVICE_ACCOUNT_BASE64` in Render so the API can verify Firebase ID tokens.

## Required production env vars

- `PUBLIC_APP_URL`
- `CLIENT_ORIGINS`
- `AUTH_SECRET`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD` or `ADMIN_PASSWORD_HASH`
- `ADMIN_AUTH_SECRET`
- `TIDB_HOST`
- `TIDB_PORT`
- `TIDB_USER`
- `TIDB_PASSWORD`
- `TIDB_DB_NAME`
- `TIDB_ENABLE_SSL`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_SERVICE_ACCOUNT` or `FIREBASE_SERVICE_ACCOUNT_BASE64`
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`

## Optional production env vars

- `TIDB_CA_PATH`
- `TIDB_CA_CERT`
- `DB_CREATE_IF_MISSING`
- `SEED_SAMPLE_EVENTS`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `MAIL_FROM`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

## First deploy checklist

1. Confirm your TiDB Cloud IP allowlist includes Render or uses a reachable public endpoint.
2. Run the Render deploy.
3. Verify the pre-deploy bootstrap succeeds.
4. Open `/api/health`.
5. Test:
   - user signup/login
   - admin login
   - event creation
   - event approval
   - booking flow
   - notification flow
   - Firebase Google login on the Render URL, not only locally

## Google login on Render

The production app uses Firebase full-page redirect login. This avoids browser popup blockers and works on Render as long as the Render domain is authorized in Firebase.

Use the Render URL exactly as users open it, for example `https://eventpulse.onrender.com`. In Firebase Authorized domains, add only `eventpulse.onrender.com`.

After changing any `VITE_FIREBASE_*` variable in Render, trigger a new deploy. Runtime restarts are not enough because these variables are compiled into the React bundle.

If login returns to the auth page with an error:

- `This domain is not authorized...`: add the Render host in Firebase Authorized domains and redeploy if the URL/env changed.
- `Google sign-in is not enabled...`: enable Google in Firebase Authentication sign-in providers.
- `Firebase web app configuration is invalid...`: check the `VITE_FIREBASE_*` Render environment variables and redeploy.
- `Unable to verify Firebase Google account.`: replace the backend `FIREBASE_SERVICE_ACCOUNT` or `FIREBASE_SERVICE_ACCOUNT_BASE64` value in Render.

## Local commands

- `npm run db:check`
- `npm run db:bootstrap`
- `npm run dev:full`
- `npm run build`
- `npm test`
