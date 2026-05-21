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
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `FIREBASE_SERVICE_ACCOUNT` or `FIREBASE_SERVICE_ACCOUNT_BASE64`
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`

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
   - Firebase Google login if configured

## Local commands

- `npm run db:check`
- `npm run db:bootstrap`
- `npm run dev:full`
- `npm run build`
- `npm test`
