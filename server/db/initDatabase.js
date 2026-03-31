import { EVENTS } from "../../src/data/events.js";
import { config } from "../config.js";
import { getPool } from "./pool.js";
// check
const TABLE_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    preferences_json LONGTEXT NOT NULL,
    saved_location_json LONGTEXT NULL,
    has_onboarded TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS events (
    id VARCHAR(80) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(80) NOT NULL,
    city VARCHAR(120) NOT NULL,
    venue VARCHAR(255) NOT NULL,
    latitude DECIMAL(10, 6) NOT NULL,
    longitude DECIMAL(10, 6) NOT NULL,
    price INT NOT NULL,
    date_label VARCHAR(80) NOT NULL,
    duration VARCHAR(80) NOT NULL,
    language VARCHAR(120) NOT NULL,
    audience VARCHAR(80) NOT NULL,
    hero_gradient TEXT NOT NULL,
    short_description TEXT NOT NULL,
    description TEXT NOT NULL,
    highlights_json LONGTEXT NOT NULL,
    showtimes_json LONGTEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS bookings (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    event_id VARCHAR(80) NOT NULL,
    title VARCHAR(255) NOT NULL,
    venue VARCHAR(255) NOT NULL,
    date_label VARCHAR(80) NOT NULL,
    slot VARCHAR(40) NOT NULL,
    quantity INT NOT NULL,
    total INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT bookings_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT bookings_event_fk FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
  )`,
];

async function ensureColumnExists(pool, tableName, columnName, definition) {
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS columnCount
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?`,
    [config.db.name, tableName, columnName],
  );

  if (rows[0].columnCount > 0) {
    return;
  }

  await pool.query(
    `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`,
  );
}

export async function initDatabase() {
  const pool = await getPool();

  for (const statement of TABLE_STATEMENTS) {
    await pool.query(statement);
  }

  await ensureColumnExists(pool, "events", "image_url", "TEXT NULL AFTER hero_gradient");
  await ensureColumnExists(pool, "events", "total_seats", "INT NULL");
  await ensureColumnExists(pool, "events", "remaining_seats", "INT NULL");
  await ensureColumnExists(pool, "events", "event_date", "DATETIME NULL");
  await ensureColumnExists(pool, "events", "status", "VARCHAR(20) DEFAULT 'approved'");
  await ensureColumnExists(pool, "events", "created_by_email", "VARCHAR(255) NULL");

  const upsertStatement = `
    INSERT INTO events (
      id,
      title,
      category,
      city,
      venue,
      latitude,
      longitude,
      price,
      date_label,
      duration,
      language,
      audience,
      hero_gradient,
      image_url,
      short_description,
      description,
      highlights_json,
      showtimes_json
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
    ON DUPLICATE KEY UPDATE
      title = VALUES(title),
      category = VALUES(category),
      city = VALUES(city),
      venue = VALUES(venue),
      latitude = VALUES(latitude),
      longitude = VALUES(longitude),
      price = VALUES(price),
      date_label = VALUES(date_label),
      duration = VALUES(duration),
      language = VALUES(language),
      audience = VALUES(audience),
      hero_gradient = VALUES(hero_gradient),
      image_url = VALUES(image_url),
      short_description = VALUES(short_description),
      description = VALUES(description),
      highlights_json = VALUES(highlights_json),
      showtimes_json = VALUES(showtimes_json),
      updated_at = CURRENT_TIMESTAMP
  `;

  for (const event of EVENTS) {
    await pool.execute(upsertStatement, [
      event.id,
      event.title,
      event.category,
      event.city,
      event.venue,
      event.coordinates.lat,
      event.coordinates.lng,
      event.price,
      event.dateLabel,
      event.duration,
      event.language,
      event.audience,
      event.heroGradient,
      event.imageUrl || null,
      event.shortDescription,
      event.description,
      JSON.stringify(event.highlights),
      JSON.stringify(event.showtimes),
    ]);
  }
}
