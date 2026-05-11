import request from "supertest";
import jwt from "jsonwebtoken";
import { describe, it, expect, vi, beforeEach } from "vitest";

let mockExecute;
let mockConnection;

vi.mock("../db/pool.js", () => ({
  getPool: vi.fn(async () => ({
    execute: mockExecute,
    getConnection: async () => mockConnection,
  })),
}));

vi.mock("../config.js", () => ({
  config: {
    authSecret: "test-secret",
    db: {},
    mail: {},
  },
}));

vi.mock("../index.js", () => ({
  emitToUser: vi.fn(),
  emitToEventRoom: vi.fn(),
}));

const testUser = {
  id: "user-1",
  name: "Rajat",
  email: "rajat@test.com",
  password_hash: "hash",
  preferences_json: "[]",
  saved_location_json: null,
  has_onboarded: 1,
};

const eventRow = {
  id: "event-1",
  title: "Music Night",
  category: "Music",
  city: "Delhi",
  venue: "City Club",
  latitude: 28.6139,
  longitude: 77.209,
  price: 500,
  total_seats: 100,
  remaining_seats: 10,
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
};

describe("Bookings API", () => {
  beforeEach(() => {
    vi.resetModules();

    mockExecute = vi.fn();

    mockConnection = {
      execute: vi.fn(),
      beginTransaction: vi.fn(),
      commit: vi.fn(),
      rollback: vi.fn(),
      release: vi.fn(),
    };
  });

  function getToken() {
    return jwt.sign({ userId: "user-1" }, "test-secret");
  }

  it("should reject booking without valid data", async () => {
    mockExecute.mockResolvedValueOnce([[testUser]]);

    const { createApp } = await import("../app.js");
    const app = createApp();

    const res = await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${getToken()}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("valid booking");
  });

  it("should reject booking if event does not exist", async () => {
    mockExecute.mockResolvedValueOnce([[testUser]]);

    mockConnection.execute.mockResolvedValueOnce([[]]);

    const { createApp } = await import("../app.js");
    const app = createApp();

    const res = await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${getToken()}`)
      .send({
        eventId: "wrong-event",
        slot: "7:00 PM",
        quantity: 2,
      });

    expect(res.status).toBe(404);
    expect(res.body.message).toContain("does not exist");
  });

  it("should reject booking if selected showtime is invalid", async () => {
    mockExecute.mockResolvedValueOnce([[testUser]]);

    mockConnection.execute.mockResolvedValueOnce([[eventRow]]);

    const { createApp } = await import("../app.js");
    const app = createApp();

    const res = await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${getToken()}`)
      .send({
        eventId: "event-1",
        slot: "10:00 PM",
        quantity: 2,
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("showtime");
  });

  it("should reject booking if quantity is greater than seats left", async () => {
    mockExecute.mockResolvedValueOnce([[testUser]]);

    mockConnection.execute.mockResolvedValueOnce([[eventRow]]);

    const { createApp } = await import("../app.js");
    const app = createApp();

    const res = await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${getToken()}`)
      .send({
        eventId: "event-1",
        slot: "7:00 PM",
        quantity: 15,
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("Only");
  });
});
