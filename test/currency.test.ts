import { describe, expect, it } from "vitest";
import { formatNaira } from "@/lib/currency";

describe("formatNaira", () => {
  it("formats a whole-thousands amount with a thousands separator and no decimal", () => {
    expect(formatNaira(6_000_000)).toBe("₦60,000");
  });

  it("formats an exact-naira amount with no decimal places", () => {
    expect(formatNaira(100)).toBe("₦1");
  });

  it("formats an amount with a single non-zero decimal digit", () => {
    expect(formatNaira(150)).toBe("₦1.5");
  });

  it("formats zero", () => {
    expect(formatNaira(0)).toBe("₦0");
  });

  it("formats an amount with a thousands separator and two decimal places", () => {
    expect(formatNaira(123456)).toBe("₦1,234.56");
  });

  it("formats a sub-naira amount", () => {
    expect(formatNaira(99)).toBe("₦0.99");
  });
});
