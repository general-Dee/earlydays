import { describe, expect, it } from "vitest";
import { validateRequiredString } from "@/lib/validation";

describe("validateRequiredString", () => {
  it("trims whitespace and returns the trimmed value on success", () => {
    const result = validateRequiredString("  Sports Day  ", { label: "Title", maxLength: 200 });
    expect(result).toEqual({ ok: true, value: "Sports Day" });
  });

  it("requires a value: empty string", () => {
    const result = validateRequiredString("", { label: "Title", maxLength: 200 });
    expect(result).toEqual({ ok: false, error: "Title is required" });
  });

  it("requires a value: undefined", () => {
    const result = validateRequiredString(undefined, { label: "Title", maxLength: 200 });
    expect(result).toEqual({ ok: false, error: "Title is required" });
  });

  it("requires a value: whitespace-only string", () => {
    const result = validateRequiredString("   ", { label: "Title", maxLength: 200 });
    expect(result).toEqual({ ok: false, error: "Title is required" });
  });

  it("rejects a value longer than maxLength after trimming", () => {
    const result = validateRequiredString("x".repeat(201), { label: "Title", maxLength: 200 });
    expect(result).toEqual({ ok: false, error: "Title is too long" });
  });

  it("accepts a value exactly at maxLength", () => {
    const value = "x".repeat(200);
    const result = validateRequiredString(value, { label: "Title", maxLength: 200 });
    expect(result).toEqual({ ok: true, value });
  });

  it("rejects a value that doesn't match the given pattern", () => {
    const result = validateRequiredString("11/01/2026", {
      label: "Date",
      maxLength: 20,
      pattern: { regex: /^\d{4}-\d{2}-\d{2}$/, message: "Date must be in YYYY-MM-DD format" },
    });
    expect(result).toEqual({ ok: false, error: "Date must be in YYYY-MM-DD format" });
  });

  it("accepts a value that matches the given pattern", () => {
    const result = validateRequiredString("2026-11-01", {
      label: "Date",
      maxLength: 20,
      pattern: { regex: /^\d{4}-\d{2}-\d{2}$/, message: "Date must be in YYYY-MM-DD format" },
    });
    expect(result).toEqual({ ok: true, value: "2026-11-01" });
  });

  it("skips pattern validation when no pattern is given", () => {
    const result = validateRequiredString("anything goes", { label: "Title", maxLength: 200 });
    expect(result).toEqual({ ok: true, value: "anything goes" });
  });
});
