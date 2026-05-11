import request from "supertest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import bcrypt from "bcryptjs";

let mockExecute;

vi.mock("../db/pool.js", () => ({
  getPool: vi.fn(async () => ({
    execute: mockExecute,
  })),
}));

vi.mock("../config.js", () => ({
  config: {
    authSecret: "test-secret",
    db: {},
    mail: {},
  },
}));

describe("Auth API", () => {
  beforeEach(() => {
    vi.resetModules();
    mockExecute = vi.fn();
  });

  it("should reject signup with invalid email", async () => {
    const { createApp } = await import("../app.js");
    const app = createApp();

    const res = await request(app).post("/api/auth/signup").send({
      name: "Rajat",
      email: "wrong-email",
      password: "123456",
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("valid email");
  });

  it("should reject signup with short password", async () => {
    const { createApp } = await import("../app.js");
    const app = createApp();

    const res = await request(app).post("/api/auth/signup").send({
      name: "Rajat",
      email: "rajat@test.com",
      password: "123",
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("Password");
  });

  it("should reject duplicate signup email", async () => {
    mockExecute.mockResolvedValueOnce([[{ id: "existing-user" }]]);

    const { createApp } = await import("../app.js");
    const app = createApp();

    const res = await request(app).post("/api/auth/signup").send({
      name: "Rajat",
      email: "rajat@test.com",
      password: "123456",
    });

    expect(res.status).toBe(409);
    expect(res.body.message).toContain("already exists");
  });

  it("should reject login with wrong password", async () => {
    const hash = await bcrypt.hash("correctpassword", 10);

    mockExecute.mockResolvedValueOnce([
      [
        {
          id: "user-1",
          name: "Rajat",
          email: "rajat@test.com",
          password_hash: hash,
          preferences_json: "[]",
          saved_location_json: null,
          has_onboarded: 0,
        },
      ],
    ]);

    const { createApp } = await import("../app.js");
    const app = createApp();

    const res = await request(app).post("/api/auth/login").send({
      email: "rajat@test.com",
      password: "wrongpassword",
    });

    expect(res.status).toBe(401);
    expect(res.body.message).toContain("Invalid");
  });

  it("should login successfully and return token", async () => {
    const hash = await bcrypt.hash("123456", 10);

    mockExecute.mockResolvedValueOnce([
      [
        {
          id: "user-1",
          name: "Rajat",
          email: "rajat@test.com",
          password_hash: hash,
          preferences_json: "[]",
          saved_location_json: null,
          has_onboarded: 0,
        },
      ],
    ]);

    const { createApp } = await import("../app.js");
    const app = createApp();

    const res = await request(app).post("/api/auth/login").send({
      email: "rajat@test.com",
      password: "123456",
    });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe("rajat@test.com");
  });
});
