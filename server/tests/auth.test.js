import request from "supertest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import bcrypt from "bcryptjs";

const mocks = vi.hoisted(() => ({
  execute: vi.fn(),
  verifyIdToken: vi.fn(),
}));

vi.mock("../db/pool.js", () => ({
  getPool: vi.fn(async () => ({
    execute: mocks.execute,
  })),
}));

vi.mock("google-auth-library", () => ({
  OAuth2Client: function MockOAuth2Client() {
    return {
      verifyIdToken: mocks.verifyIdToken,
    };
  },
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
    google: {
      clientId: "test-google-client-id.apps.googleusercontent.com",
    },
  },
}));

describe("Auth API", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.execute.mockReset();
    mocks.verifyIdToken.mockReset();
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
    mocks.execute.mockResolvedValueOnce([[{ id: "existing-user" }]]);

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

    mocks.execute.mockResolvedValueOnce([
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

    mocks.execute.mockResolvedValueOnce([
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

  it("should login with Google when the email matches an existing account", async () => {
    mocks.verifyIdToken.mockResolvedValueOnce({
      getPayload: () => ({
        email: "rajat@test.com",
        email_verified: true,
      }),
    });

    mocks.execute.mockResolvedValueOnce([
      [
        {
          id: "user-1",
          name: "Rajat",
          email: "rajat@test.com",
          password_hash: "unused-for-google-login",
          preferences_json: "[]",
          saved_location_json: null,
          has_onboarded: 0,
        },
      ],
    ]);

    const { createApp } = await import("../app.js");
    const app = createApp();

    const res = await request(app).post("/api/auth/google").send({
      credential: "google-id-token",
    });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe("rajat@test.com");
  });

  it("should reject Google login when no account matches the Google email", async () => {
    mocks.verifyIdToken.mockResolvedValueOnce({
      getPayload: () => ({
        email: "missing@test.com",
        email_verified: true,
      }),
    });

    mocks.execute.mockResolvedValueOnce([[]]);

    const { createApp } = await import("../app.js");
    const app = createApp();

    const res = await request(app).post("/api/auth/google").send({
      credential: "google-id-token",
    });

    expect(res.status).toBe(404);
    expect(res.body.message).toContain("No EventPulse account matches this Google email");
  });
});
