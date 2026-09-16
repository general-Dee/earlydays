import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminNotificationFailuresPanel from "@/components/AdminNotificationFailuresPanel";

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

const fakeFailure = {
  id: "fail1",
  job: "fee-reminders",
  channel: "sms",
  recipientUid: "u1",
  recipientLabel: "Aisha Bello",
  reason: "SMS wasn't sent (not configured, or the API call failed)",
  createdAt: Date.parse("2026-01-15T10:00:00.000Z"),
};

beforeEach(() => {
  vi.clearAllMocks();
  fakeUser.getIdToken.mockResolvedValue("tok");
});

describe("AdminNotificationFailuresPanel", () => {
  it("shows the login form when logged out", () => {
    useAuth.mockReturnValue({ user: null, loading: false });
    render(<AdminNotificationFailuresPanel />);

    expect(screen.getByRole("button", { name: "Log In" })).toBeInTheDocument();
  });

  it("shows a loading state while auth is resolving", () => {
    useAuth.mockReturnValue({ user: null, loading: true });
    render(<AdminNotificationFailuresPanel />);

    expect(screen.getByText("Checking login status…")).toBeInTheDocument();
  });

  it("fetches and renders notification failures for a logged-in superadmin", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ failures: [fakeFailure] }) })
    );

    render(<AdminNotificationFailuresPanel />);

    expect(await screen.findByText("fee-reminders · sms")).toBeInTheDocument();
    expect(screen.getByText("Aisha Bello")).toBeInTheDocument();
    expect(screen.getByText("SMS wasn't sent (not configured, or the API call failed)")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      "/api/admin/notification-failures",
      expect.objectContaining({ headers: { Authorization: "Bearer tok" } })
    );
  });

  it("shows a View Parent link for failures with a recipientUid", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ failures: [fakeFailure] }) })
    );

    render(<AdminNotificationFailuresPanel />);

    await screen.findByText("Aisha Bello");
    expect(screen.getByRole("link", { name: "View Parent" })).toHaveAttribute(
      "href",
      "/admin/parents?q=Aisha%20Bello"
    );
  });

  it("hides the View Parent link for failures without a recipientUid", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    const eventFailure = { ...fakeFailure, recipientUid: undefined };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ failures: [eventFailure] }) })
    );

    render(<AdminNotificationFailuresPanel />);

    await screen.findByText("Aisha Bello");
    expect(screen.queryByRole("link", { name: "View Parent" })).not.toBeInTheDocument();
  });

  it("shows a not-authorized message on a 403", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 403, json: async () => ({ error: "Not authorized" }) })
    );

    render(<AdminNotificationFailuresPanel />);

    expect(
      await screen.findByText("You’re logged in, but this account isn’t authorized to view notification failures.")
    ).toBeInTheDocument();
  });

  it("shows an empty state when there are no recorded failures", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ failures: [] }) })
    );

    render(<AdminNotificationFailuresPanel />);

    expect(await screen.findByText("No notification failures recorded yet.")).toBeInTheDocument();
  });

  it("exports the loaded failures as a CSV download", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ failures: [fakeFailure] }) })
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

    render(<AdminNotificationFailuresPanel />);
    await screen.findByText("fee-reminders · sms");

    const link = document.createElement("a");
    const clickSpy = vi.spyOn(link, "click").mockImplementation(() => {});
    const createElementSpy = vi.spyOn(document, "createElement").mockReturnValue(link);

    await userEvent.click(screen.getByRole("button", { name: "Export CSV" }));

    expect(clickSpy).toHaveBeenCalled();
    expect(link.download).toMatch(/^notification-failures-\d{4}-\d{2}-\d{2}\.csv$/);

    expect(capturedContent).toContain("Job,Channel,Recipient,Reason,Created At");
    expect(capturedContent).toContain("fee-reminders,sms,Aisha Bello");

    createElementSpy.mockRestore();
  });
});
