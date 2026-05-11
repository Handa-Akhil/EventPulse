import request from "supertest";
import { describe, it, expect } from "vitest";
import { createApp } from "../app.js";

describe("Health API", () => {
  it("should return API status ok", async () => {
    const app = createApp();

    const res = await request(app).get("/api/health");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});
