import { describe, expect, it } from "vitest";
import { normalizeNigerianPhone } from "@/lib/phone";

describe("normalizeNigerianPhone", () => {
  it("converts a leading-zero local number to E.164", () => {
    expect(normalizeNigerianPhone("08012345678")).toBe("+2348012345678");
  });

  it("passes through a number already in E.164", () => {
    expect(normalizeNigerianPhone("+2348012345678")).toBe("+2348012345678");
  });

  it("adds the plus to a 234-prefixed number missing it", () => {
    expect(normalizeNigerianPhone("2348012345678")).toBe("+2348012345678");
  });

  it("strips spaces, dashes, and parentheses before matching", () => {
    expect(normalizeNigerianPhone("0801 234 5678")).toBe("+2348012345678");
    expect(normalizeNigerianPhone("(0801) 234-5678")).toBe("+2348012345678");
  });

  it("returns null for numbers that don't match a known format", () => {
    expect(normalizeNigerianPhone("12345")).toBeNull();
    expect(normalizeNigerianPhone("not a phone number")).toBeNull();
    expect(normalizeNigerianPhone("")).toBeNull();
  });
});
