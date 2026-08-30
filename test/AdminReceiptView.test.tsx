import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminReceiptView from "@/components/AdminReceiptView";

const fakeUser = { getIdToken: vi.fn().mockResolvedValue("tok") } as any;

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

beforeEach(() => {
  vi.clearAllMocks();
  fakeUser.getIdToken.mockResolvedValue("tok");
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AdminReceiptView", () => {
  it("shows a loading state initially", () => {
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise(() => {})));
    render(<AdminReceiptView user={fakeUser} reference="edy_1" uid="u1" />);

    expect(screen.getByText("Loading receipt…")).toBeInTheDocument();
  });

  it("renders the receipt for a successful payment", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ payment: fakePayment, guardianName: "Aisha", guardianEmail: "a@b.com" }),
      })
    );

    render(<AdminReceiptView user={fakeUser} reference="edy_1" uid="u1" />);

    expect(await screen.findByText("Zainab")).toBeInTheDocument();
    expect(screen.getByText("Aisha")).toBeInTheDocument();
    expect(screen.getByText("Term 3")).toBeInTheDocument();
    expect(screen.getByText("₦60,000")).toBeInTheDocument();
    expect(screen.getByText("edy_1")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      "/api/admin/payments/edy_1?uid=u1",
      expect.objectContaining({ headers: { Authorization: "Bearer tok" } })
    );
  });

  it("shows a pending-payment message instead of a receipt", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          payment: { ...fakePayment, status: "pending" },
          guardianName: "Aisha",
          guardianEmail: "a@b.com",
        }),
      })
    );

    render(<AdminReceiptView user={fakeUser} reference="edy_1" uid="u1" />);

    expect(
      await screen.findByText("This payment is pending — there’s no receipt to print yet.")
    ).toBeInTheDocument();
  });

  it("shows not-found when the payment doesn't exist", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) }));

    render(<AdminReceiptView user={fakeUser} reference="edy_missing" uid="u1" />);

    expect(
      await screen.findByText("We couldn’t find a payment with this reference.")
    ).toBeInTheDocument();
  });

  it("shows an error state when the request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));

    render(<AdminReceiptView user={fakeUser} reference="edy_1" uid="u1" />);

    expect(await screen.findByText("Couldn’t load this receipt. Please try again.")).toBeInTheDocument();
  });
});
