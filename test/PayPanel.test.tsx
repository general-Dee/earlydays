import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PayPanel from "@/components/PayPanel";

const useAuth = vi.fn();
const getDoc = vi.fn();

vi.mock("@/lib/firebase/AuthProvider", () => ({
  useAuth: () => useAuth(),
}));

vi.mock("firebase/firestore", () => ({
  doc: () => ({}),
  getDoc: (...args: unknown[]) => getDoc(...args),
}));

vi.mock("@/lib/firebase/client", () => ({
  getFirebaseDb: () => ({}),
}));

vi.mock("next/script", () => ({
  default: () => null,
}));

const fakeChild = { id: "c1", name: "Kid", stage: "N1" };
const fakeParent = { email: "p@example.com", children: [fakeChild] };
const fakeUser = { uid: "u1", getIdToken: vi.fn().mockResolvedValue("tok") };

function mockPaystackPopup() {
  window.PaystackPop = {
    resumeTransaction: (_accessCode, { onSuccess }) => {
      onSuccess?.();
    },
  };
}

async function renderReadyPanel() {
  useAuth.mockReturnValue({ user: fakeUser, loading: false });
  getDoc.mockResolvedValue({ exists: () => true, data: () => fakeParent });
  render(<PayPanel />);
  const button = await screen.findByRole("button", { name: "Pay Fees Now →" });
  await waitFor(() => expect(button).toBeEnabled());
  return button;
}

beforeEach(() => {
  vi.clearAllMocks();
  fakeUser.getIdToken.mockResolvedValue("tok");
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete window.PaystackPop;
});

describe("PayPanel", () => {
  it("prompts logged-out visitors to log in", async () => {
    useAuth.mockReturnValue({ user: null, loading: false });
    render(<PayPanel />);

    expect(await screen.findByRole("link", { name: "Log in to pay fees →" })).toBeInTheDocument();
  });

  it("confirms payment on the happy path", async () => {
    const button = await renderReadyPanel();
    mockPaystackPopup();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url === "/api/paystack/initialize") {
          return Promise.resolve({
            ok: true,
            json: async () => ({ accessCode: "AC1", reference: "edy_1" }),
          });
        }
        return Promise.resolve({ ok: true, json: async () => ({ status: "success" }) });
      })
    );

    fireEvent.click(button);

    expect(await screen.findByText("Payment confirmed — thank you!")).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: "View receipt →" })).toHaveAttribute(
      "href",
      "/portal/receipts/edy_1"
    );
  });

  it("retries a transient verify failure and still confirms success", async () => {
    const button = await renderReadyPanel();
    mockPaystackPopup();

    let verifyAttempts = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url === "/api/paystack/initialize") {
          return Promise.resolve({
            ok: true,
            json: async () => ({ accessCode: "AC1", reference: "edy_1" }),
          });
        }
        verifyAttempts += 1;
        if (verifyAttempts === 1) {
          return Promise.resolve({ ok: false, status: 502, json: async () => ({}) });
        }
        return Promise.resolve({ ok: true, json: async () => ({ status: "success" }) });
      })
    );

    fireEvent.click(button);

    expect(
      await screen.findByText("Payment confirmed — thank you!", {}, { timeout: 5000 })
    ).toBeInTheDocument();
    expect(verifyAttempts).toBe(2);
  });

  it("shows an error and re-enables the button when verify keeps failing", async () => {
    const button = await renderReadyPanel();
    mockPaystackPopup();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url === "/api/paystack/initialize") {
          return Promise.resolve({
            ok: true,
            json: async () => ({ accessCode: "AC1", reference: "edy_1" }),
          });
        }
        return Promise.resolve({ ok: false, status: 500, json: async () => ({}) });
      })
    );

    fireEvent.click(button);

    expect(
      await screen.findByText(
        "We couldn't confirm this payment yet. Contact the school if you were charged.",
        {},
        { timeout: 5000 }
      )
    ).toBeInTheDocument();
    await waitFor(() => expect(button).toBeEnabled());
    expect(button).toHaveTextContent("Pay Fees Now →");
  });
});
