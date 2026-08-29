import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import FeesTable from "@/components/FeesTable";

const getFeeAmounts = vi.fn();

vi.mock("@/lib/feeSettings", () => ({
  getFeeAmounts: () => getFeeAmounts(),
  defaultFeeAmounts: () => ({
    creche: 45_000_00,
    "pre-nursery": 50_000_00,
    nursery: 60_000_00,
    "primary-junior": 75_000_00,
    "primary-senior": 85_000_00,
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("FeesTable", () => {
  it("renders every bracket's label, age range, and live amount", async () => {
    getFeeAmounts.mockResolvedValue({
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

  it("falls back to the bracket default when an amount is missing", async () => {
    getFeeAmounts.mockResolvedValue({});

    render(await FeesTable());

    expect(screen.getByText("₦45,000")).toBeInTheDocument();
    expect(screen.getByText("₦85,000")).toBeInTheDocument();
  });

  it("falls back to default amounts entirely when the live read fails", async () => {
    getFeeAmounts.mockRejectedValue(new Error("Firestore unreachable"));

    render(await FeesTable());

    expect(screen.getByText("Creche")).toBeInTheDocument();
    expect(screen.getByText("₦45,000")).toBeInTheDocument();
    expect(screen.getByText("₦85,000")).toBeInTheDocument();
  });
});
