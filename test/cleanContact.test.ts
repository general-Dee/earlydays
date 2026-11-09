import { describe, expect, it } from "vitest";
import { cleanContact } from "@/lib/data";

describe("cleanContact", () => {
  it("treats unset and the old placeholder values as empty", () => {
    expect(cleanContact(undefined)).toBe("");
    expect(cleanContact("  ")).toBe("");
    expect(cleanContact("+234 000 000 0000")).toBe("");
    expect(cleanContact("2340000000000")).toBe("");
    expect(cleanContact("hello@earlydays.example")).toBe("");
  });

  it("keeps real values", () => {
    expect(cleanContact("+234 803 123 4567")).toBe("+234 803 123 4567");
    expect(cleanContact("2348031234567")).toBe("2348031234567");
    expect(cleanContact("office@school.ng")).toBe("office@school.ng");
  });
});
