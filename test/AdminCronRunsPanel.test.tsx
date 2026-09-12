import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
  createdAt: Date.parse("2026-01-15T10:00:00.000Z"),
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

  it("exports the loaded cron runs as a CSV download", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ runs: [fakeRun] }) })
    );

    // jsdom's Blob shim doesn't implement .text()/.arrayBuffer(), so capture
    // the CSV content at construction time instead of reading it back off a Blob.
    let capturedContent = "";
    const RealBlob = globalThis.Blob;
    vi.stubGlobal(
      "Blob",
      vi.fn((parts: BlobPart[], options?: BlobPropertyBag) => {
        capturedContent = parts.join("");
        return new RealBlob(parts, options);
      })
    );
    URL.createObjectURL = vi.fn(() => "blob:fake-url");
    URL.revokeObjectURL = vi.fn();

    render(<AdminCronRunsPanel />);
    await screen.findByText("event-reminders");

    const link = document.createElement("a");
    const clickSpy = vi.spyOn(link, "click").mockImplementation(() => {});
    const createElementSpy = vi.spyOn(document, "createElement").mockReturnValue(link);

    await userEvent.click(screen.getByRole("button", { name: "Export CSV" }));

    expect(clickSpy).toHaveBeenCalled();
    expect(link.download).toMatch(/^cron-runs-\d{4}-\d{2}-\d{2}\.csv$/);

    expect(capturedContent).toContain("Job,Counts,Failures,Created At");
    expect(capturedContent).toContain(
      'event-reminders,"eventsChecked: 1, emailsSent: 2",0,2026-01-15T10:00:00.000Z'
    );

    createElementSpy.mockRestore();
  });
});
