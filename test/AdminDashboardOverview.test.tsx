import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminDashboardOverview from "@/components/AdminDashboardOverview";

const signOut = vi.fn();

vi.mock("firebase/auth", () => ({
  signOut: (...args: unknown[]) => signOut(...args),
}));

vi.mock("@/lib/firebase/client", () => ({
  getFirebaseAuth: () => ({}),
}));

const fakeUser = { email: "staff@earlydays.example", getIdToken: vi.fn().mockResolvedValue("tok") } as any;

const fakeData = {
  term: "Term 2",
  applicationCounts: { new: 1, reviewing: 0, accepted: 0, waitlisted: 0, declined: 0 },
  newInquiries: 2,
  fees: { childrenPaid: 1, childrenUnpaid: 1, amountCollectedKobo: 60_000_00, amountExpectedKobo: 135_000_00 },
  feeAmounts: {
    creche: 45_000_00,
    "pre-nursery": 50_000_00,
    nursery: 60_000_00,
    "primary-junior": 75_000_00,
    "primary-senior": 85_000_00,
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  fakeUser.getIdToken.mockResolvedValue("tok");
});

describe("AdminDashboardOverview", () => {
  it("shows a loading state initially", () => {
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise(() => {})));
    render(<AdminDashboardOverview user={fakeUser} />);

    expect(screen.getByText("Loading overview…")).toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it("renders the fee schedule alongside the current term", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => fakeData }));
    render(<AdminDashboardOverview user={fakeUser} />);

    expect(await screen.findByText("Fee collection — Term 2")).toBeInTheDocument();
    expect(screen.getByText("Creche")).toBeInTheDocument();
    expect(screen.getByText("₦45,000")).toBeInTheDocument();
    expect(screen.getByText("₦85,000")).toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it("edits the fee schedule and updates the display in place", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "PATCH") {
        const body = JSON.parse(init.body as string) as { feesKobo: Record<string, number> };
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ feeAmounts: body.feesKobo }) });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => fakeData });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminDashboardOverview user={fakeUser} />);
    await screen.findByText("Fee collection — Term 2");

    await userEvent.click(screen.getByRole("button", { name: "Change fee schedule" }));

    const crecheInput = screen.getByLabelText("Creche");
    await userEvent.clear(crecheInput);
    await userEvent.type(crecheInput, "50000");

    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/dashboard",
      expect.objectContaining({
        method: "PATCH",
        headers: { Authorization: "Bearer tok", "Content-Type": "application/json" },
      })
    );
    const [, patchCall] = fetchMock.mock.calls.find(([, init]) => init?.method === "PATCH")!;
    const sentBody = JSON.parse(patchCall.body);
    expect(sentBody.feesKobo.creche).toBe(50_000_00);
    // Other brackets are sent unchanged alongside the edited one.
    expect(sentBody.feesKobo.nursery).toBe(60_000_00);

    const crecheCard = await screen.findByText("Creche");
    expect(crecheCard.closest("div")).toHaveTextContent("₦50,000");
    vi.unstubAllGlobals();
  });

  it("rejects a zero fee amount without sending a request", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => fakeData }));
    render(<AdminDashboardOverview user={fakeUser} />);
    await screen.findByText("Fee collection — Term 2");

    await userEvent.click(screen.getByRole("button", { name: "Change fee schedule" }));
    const crecheInput = screen.getByLabelText("Creche");
    await userEvent.clear(crecheInput);
    await userEvent.type(crecheInput, "0");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Enter a valid amount for Creche")).toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it("shows a server error and keeps the form open when the fee update fails", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "PATCH") {
        return Promise.resolve({ ok: false, status: 400, json: async () => ({ error: "Invalid amount" }) });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => fakeData });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminDashboardOverview user={fakeUser} />);
    await screen.findByText("Fee collection — Term 2");

    await userEvent.click(screen.getByRole("button", { name: "Change fee schedule" }));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Invalid amount")).toBeInTheDocument();
    expect(screen.getByLabelText("Creche")).toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it("logs out when the Log Out button is clicked", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => fakeData }));
    render(<AdminDashboardOverview user={fakeUser} />);
    await screen.findByText("Fee collection — Term 2");

    await userEvent.click(screen.getByRole("button", { name: "Log Out" }));

    expect(signOut).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
