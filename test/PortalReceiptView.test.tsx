import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PortalReceiptView from "@/components/PortalReceiptView";

const getDoc = vi.fn();

vi.mock("firebase/firestore", () => ({
  doc: () => ({}),
  getDoc: (...args: unknown[]) => getDoc(...args),
}));

vi.mock("@/lib/firebase/client", () => ({
  getFirebaseDb: () => ({}),
}));

const fakeUser = { uid: "u1" } as any;

const fakePayment = {
  reference: "edy_1",
  childId: "c1",
  childName: "Zainab",
  term: "Term 3",
  amountKobo: 60_000_00,
  status: "success",
  createdAt: 1,
  paidAt: 2,
  channel: "card",
};

const fakeParent = { guardianName: "Aisha", email: "a@b.com", children: [] };

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("PortalReceiptView", () => {
  it("shows a loading state initially", () => {
    getDoc.mockReturnValue(new Promise(() => {}));
    render(<PortalReceiptView user={fakeUser} reference="edy_1" />);

    expect(screen.getByText("Loading receipt…")).toBeInTheDocument();
  });

  it("renders the receipt for a successful payment", async () => {
    getDoc
      .mockResolvedValueOnce({ exists: () => true, data: () => fakePayment })
      .mockResolvedValueOnce({ exists: () => true, data: () => fakeParent });

    render(<PortalReceiptView user={fakeUser} reference="edy_1" />);

    expect(await screen.findByText("Zainab")).toBeInTheDocument();
    expect(screen.getByText("Aisha")).toBeInTheDocument();
    expect(screen.getByText("Term 3")).toBeInTheDocument();
    expect(screen.getByText("₦60,000")).toBeInTheDocument();
    expect(screen.getByText("edy_1")).toBeInTheDocument();
  });

  it("shows not-found when the payment doc doesn't exist", async () => {
    getDoc.mockResolvedValueOnce({ exists: () => false });

    render(<PortalReceiptView user={fakeUser} reference="edy_missing" />);

    expect(
      await screen.findByText("We couldn’t find a completed payment with this reference.")
    ).toBeInTheDocument();
  });

  it("shows not-found when the payment hasn't succeeded yet", async () => {
    getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ ...fakePayment, status: "pending" }),
    });

    render(<PortalReceiptView user={fakeUser} reference="edy_1" />);

    expect(
      await screen.findByText("We couldn’t find a completed payment with this reference.")
    ).toBeInTheDocument();
  });

  it("shows an error state when the read fails", async () => {
    getDoc.mockRejectedValue(new Error("permission-denied"));

    render(<PortalReceiptView user={fakeUser} reference="edy_1" />);

    expect(await screen.findByText("Couldn’t load this receipt. Please try again.")).toBeInTheDocument();
  });
});
