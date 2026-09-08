import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminCronRunsPanel from "@/components/AdminCronRunsPanel";

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

vi.mock("@/lib/firebase/admin-access-context", () => ({
  useAdminAccess: () => ({ status: "ready", isSuperAdmin: true, areas: [] }),
}));

const fakeUser = { uid: "u1", email: "boss@earlydays.example", getIdToken: vi.fn().mockResolvedValue("tok") };

const fakeRun = {
  id: "run1",
  job: "event-reminders",
  createdAt: Date.now(),
  counts: { eventsChecked: 1, emailsSent: 2 },
  failures: 0,
};

beforeEach(() => {
  vi.clearAllMocks();
  fakeUser.getIdToken.mockResolvedValue("tok");
});

describe("AdminCronRunsPanel", () => {
  it("shows the login form when logged out", () => {
    useAuth.mockReturnValue({ user: null, loading: false });
    render(<AdminCronRunsPanel />);

    expect(screen.getByRole("button", { name: "Log In" })).toBeInTheDocument();
  });

  it("shows a loading state while auth is resolving", () => {
    useAuth.mockReturnValue({ user: null, loading: true });
    render(<AdminCronRunsPanel />);

    expect(screen.getByText("Checking login status…")).toBeInTheDocument();
  });

  it("fetches and renders cron runs for a logged-in superadmin", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ runs: [fakeRun] }) })
    );

    render(<AdminCronRunsPanel />);

    expect(await screen.findByText("event-reminders")).toBeInTheDocument();
    expect(screen.getByText("eventsChecked: 1, emailsSent: 2")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      "/api/admin/cron-runs",
      expect.objectContaining({ headers: { Authorization: "Bearer tok" } })
    );
  });

  it("shows a failures badge when a run had send failures", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ runs: [{ ...fakeRun, failures: 2 }] }),
      })
    );

    render(<AdminCronRunsPanel />);

    expect(await screen.findByText("2 failures")).toBeInTheDocument();
  });

  it("shows a not-authorized message on a 403", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 403, json: async () => ({ error: "Not authorized" }) })
    );

    render(<AdminCronRunsPanel />);

    expect(
      await screen.findByText("You’re logged in, but this account isn’t authorized to view cron runs.")
    ).toBeInTheDocument();
  });

  it("shows an empty state when there are no recorded runs", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ runs: [] }) }));

    render(<AdminCronRunsPanel />);

    expect(await screen.findByText("No cron runs recorded yet.")).toBeInTheDocument();
  });
});
