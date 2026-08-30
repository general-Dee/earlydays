import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminPaymentsPanel from "@/components/AdminPaymentsPanel";

const useAuth = vi.fn();

vi.mock("@/lib/firebase/AuthProvider", () => ({
  useAuth: () => useAuth(),
}));

vi.mock("firebase/auth", () => ({
  signOut: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
}));

vi.mock("@/lib/firebase/client", () => ({
  getFirebaseAuth: () => "fake-auth",
}));

const fakeUser = { email: "staff@earlydays.example", getIdToken: vi.fn().mockResolvedValue("tok") };

const fakePayment = {
  reference: "edy_1",
  childId: "c1",
  childName: "Zainab",
  term: "Term 1",
  amountKobo: 60_000_00,
  status: "success",
  createdAt: Date.now(),
  parentUid: "u1",
  guardianName: "Aisha Bello",
  guardianEmail: "aisha@example.com",
};

beforeEach(() => {
  vi.clearAllMocks();
  fakeUser.getIdToken.mockResolvedValue("tok");
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AdminPaymentsPanel", () => {
  it("shows the login form when logged out", () => {
    useAuth.mockReturnValue({ user: null, loading: false });
    render(<AdminPaymentsPanel />);

    expect(screen.getByRole("button", { name: "Log In" })).toBeInTheDocument();
  });

  it("shows a loading state while auth is resolving", () => {
    useAuth.mockReturnValue({ user: null, loading: true });
    render(<AdminPaymentsPanel />);

    expect(screen.getByText("Checking login status…")).toBeInTheDocument();
  });

  it("fetches and renders payments for a logged-in user", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ payments: [fakePayment] }),
      })
    );

    render(<AdminPaymentsPanel />);

    expect(await screen.findByText("Aisha Bello · Zainab")).toBeInTheDocument();
    expect(screen.getByText("edy_1")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View Receipt" })).toHaveAttribute(
      "href",
      "/admin/payments/edy_1?uid=u1"
    );
    expect(fetch).toHaveBeenCalledWith(
      "/api/admin/payments",
      expect.objectContaining({ headers: { Authorization: "Bearer tok" } })
    );
  });

  it("shows a not-authorized message on a 403", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 403, json: async () => ({ error: "Not authorized" }) })
    );

    render(<AdminPaymentsPanel />);

    expect(
      await screen.findByText("You’re logged in, but this account isn’t authorized to view payments.")
    ).toBeInTheDocument();
  });

  it("narrows the list by a search term", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    const other = { ...fakePayment, reference: "edy_2", parentUid: "u2", guardianName: "Chidi Okoye", childName: "Emeka" };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ payments: [fakePayment, other] }) })
    );

    render(<AdminPaymentsPanel />);
    await screen.findByText("Aisha Bello · Zainab");
    expect(screen.getByText("Chidi Okoye · Emeka")).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("Search payments"), "Emeka");

    expect(screen.getByText("Chidi Okoye · Emeka")).toBeInTheDocument();
    expect(screen.queryByText("Aisha Bello · Zainab")).not.toBeInTheDocument();
  });

  it("narrows the list by the status filter", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    const pending = { ...fakePayment, reference: "edy_2", parentUid: "u2", guardianName: "Chidi Okoye", childName: "Emeka", status: "pending" };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ payments: [fakePayment, pending] }) })
    );

    render(<AdminPaymentsPanel />);
    await screen.findByText("Aisha Bello · Zainab");

    await userEvent.selectOptions(screen.getByLabelText("Filter by status"), "pending");

    expect(screen.getByText("Chidi Okoye · Emeka")).toBeInTheDocument();
    expect(screen.queryByText("Aisha Bello · Zainab")).not.toBeInTheDocument();
  });
});
