import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, "..", "..");
const distPath = path.join(projectRoot, "dist");
const indexPath = path.join(distPath, "index.html");
let createdTestIndex = false;

vi.mock("../config.js", () => ({
  config: {
    env: "test",
    isProduction: false,
    server: {
      allowedOrigins: [],
      trustProxy: false,
      serveStaticClient: true,
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
    db: {
      provider: "tidb",
    },
    mail: {},
    logging: {},
    firebase: {
      projectId: "",
    },
  },
}));

describe("Static client", () => {
  beforeAll(() => {
    if (!fs.existsSync(indexPath)) {
      fs.mkdirSync(distPath, { recursive: true });
      fs.writeFileSync(indexPath, "<!doctype html><div id=\"root\"></div>");
      createdTestIndex = true;
    }
  });

  afterAll(() => {
    if (createdTestIndex) {
      fs.rmSync(indexPath, { force: true });
    }
  });

  it("serves the built React app at the root URL", async () => {
    const { createApp } = await import("../app.js");
    const app = createApp();

    const res = await request(app).get("/");

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/html");
    expect(res.text.toLowerCase()).toContain("<!doctype html>");
  });

  it("falls back to the React app for client-side routes", async () => {
    const { createApp } = await import("../app.js");
    const app = createApp();

    const res = await request(app).get("/events/example-event");

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/html");
  });
});
