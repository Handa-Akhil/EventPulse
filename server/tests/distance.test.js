import { describe, it, expect } from "vitest";
import { getDistanceKm } from "../utils/distance.js";

describe("Distance Utility", () => {
  it("should return null if location is missing", () => {
    expect(getDistanceKm(null, { lat: 28.6, lng: 77.2 })).toBe(null);
  });

  it("should return zero distance for same coordinates", () => {
    const distance = getDistanceKm(
      { lat: 28.6139, lng: 77.209 },
      { lat: 28.6139, lng: 77.209 },
    );

    expect(distance).toBeCloseTo(0);
  });

  it("should calculate approximate distance between Delhi and Mumbai", () => {
    const distance = getDistanceKm(
      { lat: 28.6139, lng: 77.209 },
      { lat: 19.076, lng: 72.8777 },
    );

    expect(distance).toBeGreaterThan(1100);
    expect(distance).toBeLessThan(1300);
  });
});
