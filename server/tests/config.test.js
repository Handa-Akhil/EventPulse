import { afterEach, describe, expect, it, vi } from "vitest";

const envKeys = [
  "NODE_ENV",
  "RENDER",
  "SERVE_STATIC_CLIENT",
  "AUTH_SECRET",
  "ADMIN_AUTH_SECRET",
  "ADMIN_PASSWORD",
  "TIDB_HOST",
  "TIDB_USER",
  "TIDB_PASSWORD",
  "TIDB_DB_NAME",
];
const originalEnv = Object.fromEntries(
  envKeys.map((key) => [key, process.env[key]]),
);

function restoreEnv() {
  for (const key of envKeys) {
    if (originalEnv[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = originalEnv[key];
    }
  }
}

async function loadConfigWithEnv(values) {
  vi.resetModules();
  restoreEnv();

  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  return import("../config.js");
}

describe("Config", () => {
  afterEach(() => {
    restoreEnv();
    vi.resetModules();
  });

  it("serves the built client by default on Render", async () => {
    const { config } = await loadConfigWithEnv({
      NODE_ENV: "development",
      RENDER: "true",
      SERVE_STATIC_CLIENT: "",
    });

    expect(config.server.serveStaticClient).toBe(true);
  });

  it("allows static client serving to be disabled explicitly", async () => {
    const { config } = await loadConfigWithEnv({
      NODE_ENV: "production",
      RENDER: "true",
      SERVE_STATIC_CLIENT: "false",
      AUTH_SECRET: "test-secret",
      ADMIN_AUTH_SECRET: "test-admin-secret",
      ADMIN_PASSWORD: "test-password",
      TIDB_HOST: "localhost",
      TIDB_USER: "test-user",
      TIDB_PASSWORD: "test-password",
      TIDB_DB_NAME: "eventpulse_test",
    });

    expect(config.server.serveStaticClient).toBe(false);
  });
});
