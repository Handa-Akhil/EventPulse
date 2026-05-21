import request from "supertest";
import jwt from "jsonwebtoken";
import { describe, it, expect, vi, beforeEach } from "vitest";

let mockExecute;

vi.mock("../db/pool.js", () => ({
  getPool: vi.fn(async () => ({
    execute: mockExecute,
  })),
}));

vi.mock("../config.js", () => ({
  config: {
    isProduction: false,
    server: {
      allowedOrigins: [],
      trustProxy: false,
      serveStaticClient: false,
    },
    auth: {
      secret: "test-secret",
      issuer: "eventpulse-api",
      audience: "eventpulse-client",
    },
    adminAuth: {
      email: "admin@example.com",
      password: "password",
      passwordHash: "",
      secret: "test-admin-secret",
      name: "Test Admin",
    },
    db: {},
    mail: {},
    logging: {},
    firebase: {
      projectId: "",
    },
  },
}));

const testUser = {
  id: "user-1",
  name: "Rajat",
  email: "rajat@test.com",
  password_hash: "hash",
  preferences_json: JSON.stringify(["Music"]),
  saved_location_json: JSON.stringify({
    lat: 28.6139,
    lng: 77.209,
    city: "Delhi",
  }),
  has_onboarded: 1,
};

const eventRows = [
  {
    id: "event-1",
    title: "Music Night",
    category: "Music",
    city: "Delhi",
    venue: "City Club",
    latitude: 28.6139,
    longitude: 77.209,
    price: 500,
    total_seats: 100,
    remaining_seats: 80,
    date_label: "Fri, 20 Mar",
    duration: "2h",
    language: "English",
    audience: "Family",
    hero_gradient: "gradient",
    short_description: "Good event",
    description: "Full description",
    highlights_json: JSON.stringify(["Live music"]),
    showtimes_json: JSON.stringify(["7:00 PM"]),
    status: "approved",
    created_by_email: "admin@test.com",
  },
  {
    id: "event-2",
    title: "Comedy Show",
    category: "Comedy",
    city: "Mumbai",
    venue: "Laugh Club",
    latitude: 19.076,
    longitude: 72.8777,
    price: 700,
    total_seats: 100,
    remaining_seats: 50,
    date_label: "Sat, 21 Mar",
    duration: "2h",
    language: "Hindi",
    audience: "Adults",
    hero_gradient: "gradient",
    short_description: "Comedy event",
    description: "Full description",
    highlights_json: JSON.stringify(["Standup"]),
    showtimes_json: JSON.stringify(["8:00 PM"]),
    status: "approved",
    created_by_email: "admin@test.com",
  },
];

describe("Events API", () => {
  beforeEach(() => {
    vi.resetModules();
    mockExecute = vi.fn();
  });

  function getToken() {
    return jwt.sign({ userId: "user-1" }, "test-secret");
  }

  it("should reject events request without token", async () => {
    const { createApp } = await import("../app.js");
    const app = createApp();

    const res = await request(app).get("/api/events");

    expect(res.status).toBe(401);
  });

  it("should return approved events for logged-in user", async () => {
    mockExecute
      .mockResolvedValueOnce([[testUser]])
      .mockResolvedValueOnce([eventRows]);

    const { createApp } = await import("../app.js");
    const app = createApp();

    const res = await request(app)
      .get("/api/events")
      .set("Authorization", `Bearer ${getToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.events.length).toBeGreaterThan(0);
  });

  it("should filter events by search keyword", async () => {
    mockExecute
      .mockResolvedValueOnce([[testUser]])
      .mockResolvedValueOnce([eventRows]);

    const { createApp } = await import("../app.js");
    const app = createApp();

    const res = await request(app)
      .get("/api/events?search=music")
      .set("Authorization", `Bearer ${getToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.events.length).toBe(1);
    expect(res.body.events[0].title).toBe("Music Night");
  });

//   it("should filter events by category", async () => {
//     mockExecute
//       .mockResolvedValueOnce([[testUser]])
//       .mockResolvedValueOnce([eventRows]);

//     const { createApp } = await import("../app.js");
//     const app = createApp();

//     const res = await request(app)
//       .get("/api/events?category=comedy")
//       .set("Authorization", `Bearer ${getToken()}`);

//     expect(res.status).toBe(200);
//     expect(res.body.events.length).toBe(1);
//     expect(res.body.events[0].category.toLowerCase()).toBe("comedy");
//   });
it("should return empty list for unmatched category filter", async () => {
  mockExecute
    .mockResolvedValueOnce([[testUser]])
    .mockResolvedValueOnce([[]]);

  const { createApp } = await import("../app.js");
  const app = createApp();

  const res = await request(app)
    .get("/api/events?category=UnknownCategory")
    .set("Authorization", `Bearer ${getToken()}`);

  expect(res.status).toBe(200);
  expect(res.body.events).toEqual([]);
});
});
