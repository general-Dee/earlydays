import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import FeesTable from "@/components/FeesTable";

const getPublicFeeAmounts = vi.fn();

vi.mock("@/lib/feeSettings", () => ({
  getPublicFeeAmounts: () => getPublicFeeAmounts(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("FeesTable", () => {
  it("renders every bracket's label, age range, and live amount", async () => {
    getPublicFeeAmounts.mockResolvedValue({
      creche: 45_000_00,
      "pre-nursery": 50_000_00,
      nursery: 60_000_00,
      "primary-junior": 75_000_00,
      "primary-senior": 85_000_00,
    });

    render(await FeesTable());

    expect(screen.getByText("Creche")).toBeInTheDocument();
    expect(screen.getByText("3–12 months")).toBeInTheDocument();
    expect(screen.getByText("₦45,000")).toBeInTheDocument();
    expect(screen.getByText("Primary 4–6")).toBeInTheDocument();
    expect(screen.getByText("₦85,000")).toBeInTheDocument();
  });

  it("only shows brackets an admin has priced", async () => {
    getPublicFeeAmounts.mockResolvedValue({ creche: 45_000_00 });

    render(await FeesTable());

    expect(screen.getByText("₦45,000")).toBeInTheDocument();
    expect(screen.queryByText("Primary 4–6")).not.toBeInTheDocument();
  });

  it("renders nothing when no real fees are set", async () => {
    getPublicFeeAmounts.mockResolvedValue(null);
    expect(await FeesTable()).toBeNull();
  });

  it("renders nothing when the live read fails", async () => {
    getPublicFeeAmounts.mockRejectedValue(new Error("Firestore unreachable"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await FeesTable()).toBeNull();
    consoleSpy.mockRestore();
  });
});
