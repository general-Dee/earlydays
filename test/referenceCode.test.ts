import { describe, expect, it } from "vitest";
import { generateReferenceCode } from "@/lib/referenceCode";

describe("generateReferenceCode", () => {
  it("returns an 8-character uppercase hex code", () => {
    expect(generateReferenceCode()).toMatch(/^[0-9A-F]{8}$/);
  });

  it("returns a different code on each call", () => {
    expect(generateReferenceCode()).not.toBe(generateReferenceCode());
  });

  it("always matches the format across many calls", () => {
    for (let i = 0; i < 100; i++) {
      expect(generateReferenceCode()).toMatch(/^[0-9A-F]{8}$/);
    }
  });
});
