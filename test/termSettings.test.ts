import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const doc = vi.fn();
const get = vi.fn();
const set = vi.fn();
const collection = vi.fn();

vi.mock("@/lib/firebase/admin", () => ({
  getAdminDb: () => ({ collection }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  collection.mockImplementation(() => ({ doc }));
  doc.mockImplementation(() => ({ get, set }));
});

afterEach(() => {
  vi.resetModules();
});

describe("getCurrentTerm", () => {
  it("returns the stored term when the settings doc exists", async () => {
    get.mockResolvedValue({ exists: true, data: () => ({ currentTerm: "Term 2" }) });
    const { getCurrentTerm } = await import("@/lib/termSettings");

    expect(await getCurrentTerm()).toBe("Term 2");
  });

  it("falls back to DEFAULT_TERM when the settings doc doesn't exist", async () => {
    get.mockResolvedValue({ exists: false });
    const { getCurrentTerm, DEFAULT_TERM } = await import("@/lib/termSettings");

    expect(await getCurrentTerm()).toBe(DEFAULT_TERM);
  });
});

describe("setCurrentTerm", () => {
  it("writes the term with a merge set", async () => {
    set.mockResolvedValue(undefined);
    const { setCurrentTerm } = await import("@/lib/termSettings");

    await setCurrentTerm("Term 2", "staff@earlydays.example");

    expect(collection).toHaveBeenCalledWith("settings");
    expect(doc).toHaveBeenCalledWith("term");
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({ currentTerm: "Term 2", updatedBy: "staff@earlydays.example" }),
      { merge: true }
    );
  });
});
