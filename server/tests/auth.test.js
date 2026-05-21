import request from "supertest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import bcrypt from "bcryptjs";

const mocks = vi.hoisted(() => ({
  execute: vi.fn(),
  isFirebaseAdminConfigured: vi.fn(() => true),
  verifyFirebaseIdToken: vi.fn(),
}));

vi.mock("../db/pool.js", () => ({
  getPool: vi.fn(async () => ({
    execute: mocks.execute,
  })),
}));

vi.mock("../services/firebaseAdmin.js", () => ({
  isFirebaseAdminConfigured: mocks.isFirebaseAdminConfigured,
  verifyFirebaseIdToken: mocks.verifyFirebaseIdToken,
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
      projectId: "test-firebase-project",
    },
  },
}));

describe("Auth API", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.execute.mockReset();
    mocks.isFirebaseAdminConfigured.mockReset();
    mocks.isFirebaseAdminConfigured.mockReturnValue(true);
    mocks.verifyFirebaseIdToken.mockReset();
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

  it("should login with Firebase Google when the email matches an existing account", async () => {
    mocks.verifyFirebaseIdToken.mockResolvedValueOnce({
      email: "rajat@test.com",
      email_verified: true,
      firebase: {
        sign_in_provider: "google.com",
      },
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
      idToken: "firebase-id-token",
    });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe("rajat@test.com");
  });

  it("should create an EventPulse account on first Firebase Google login", async () => {
    mocks.verifyFirebaseIdToken.mockResolvedValueOnce({
      email: "missing@test.com",
      email_verified: true,
      name: "Missing User",
      firebase: {
        sign_in_provider: "google.com",
      },
    });

    mocks.execute
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([
        [
          {
            id: "user-2",
            name: "Missing User",
            email: "missing@test.com",
            password_hash: "generated-google-login-password",
            preferences_json: "[]",
            saved_location_json: null,
            has_onboarded: 0,
          },
        ],
      ]);

    const { createApp } = await import("../app.js");
    const app = createApp();

    const res = await request(app).post("/api/auth/google").send({
      idToken: "firebase-id-token",
    });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe("missing@test.com");
    expect(res.body.user.name).toBe("Missing User");
  });
});
