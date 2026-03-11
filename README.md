# EventPulse

Full-stack event discovery app with a React frontend and an Express + MySQL API.

## What is implemented

- Login and signup with backend auth
- One-time preference selection after first signup
- Dashboard with browser location detection and manual city switching
- Nearby event discovery within 40 km based on saved user preferences
- Event details page with ticket booking
- Auto-seeded event data in MySQL on first API startup

## Tech stack

- React
- Vite
- Express
- MySQL
- JWT-based API auth
- BigDataCloud reverse geocoding API for browser location lookup

## Setup

1. Copy `.env.example` to `.env`
2. Set your MySQL credentials in `.env`
3. Make sure MySQL is running
4. Install dependencies

```bash
npm.cmd install
```

## Run

Start the API:

```bash
npm.cmd run dev:server
```

Start the React app in another terminal:

```bash
npm.cmd run dev
```

Or run both together:

```bash
npm.cmd run dev:full
```

## MySQL notes

- The API creates the configured database automatically if it does not exist
- Tables are created automatically on first startup
- Demo events are seeded automatically when the `events` table is empty
- If startup fails with access denied, update `DB_USER` and `DB_PASSWORD` in `.env`
