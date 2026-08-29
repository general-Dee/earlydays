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

describe("getFeeAmounts", () => {
  it("returns the default amounts when the settings doc doesn't exist", async () => {
    get.mockResolvedValue({ exists: false });
    const { getFeeAmounts } = await import("@/lib/feeSettings");
    const { FEE_BRACKETS } = await import("@/lib/fees");

    const amounts = await getFeeAmounts();

    for (const bracket of FEE_BRACKETS) {
      expect(amounts[bracket.id]).toBe(bracket.defaultAmountKobo);
    }
  });

  it("merges stored amounts over the defaults", async () => {
    get.mockResolvedValue({ exists: true, data: () => ({ amountsKobo: { creche: 5_000_00 } }) });
    const { getFeeAmounts } = await import("@/lib/feeSettings");
    const { FEE_BRACKETS } = await import("@/lib/fees");

    const amounts = await getFeeAmounts();

    expect(amounts.creche).toBe(5_000_00);
    const otherBracket = FEE_BRACKETS.find((b) => b.id !== "creche")!;
    expect(amounts[otherBracket.id]).toBe(otherBracket.defaultAmountKobo);
  });
});

describe("setFeeAmounts", () => {
  it("writes the amounts with a merge set", async () => {
    set.mockResolvedValue(undefined);
    const { setFeeAmounts } = await import("@/lib/feeSettings");

    await setFeeAmounts({ creche: 5_000_00 }, "staff@earlydays.example");

    expect(collection).toHaveBeenCalledWith("settings");
    expect(doc).toHaveBeenCalledWith("fees");
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({ amountsKobo: { creche: 5_000_00 }, updatedBy: "staff@earlydays.example" }),
      { merge: true }
    );
  });
});

describe("feeKoboByStageCode", () => {
  it("expands bracket amounts to every stage code in that bracket", async () => {
    const { feeKoboByStageCode } = await import("@/lib/feeSettings");
    const { FEE_BRACKETS } = await import("@/lib/fees");

    const nursery = FEE_BRACKETS.find((b) => b.id === "nursery")!;
    const map = feeKoboByStageCode({ nursery: 70_000_00 });

    for (const code of nursery.stageCodes) {
      expect(map[code]).toBe(70_000_00);
    }
  });
});

describe("getFeeKobo", () => {
  it("resolves the amount for a known stage code", async () => {
    get.mockResolvedValue({ exists: false });
    const { getFeeKobo } = await import("@/lib/feeSettings");

    expect(await getFeeKobo("N1")).toBe(60_000_00);
  });

  it("throws for an unknown stage code", async () => {
    get.mockResolvedValue({ exists: false });
    const { getFeeKobo } = await import("@/lib/feeSettings");

    await expect(getFeeKobo("XX")).rejects.toThrow('No fee configured for stage "XX"');
  });
});
