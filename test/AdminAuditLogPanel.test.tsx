import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminAuditLogPanel from "@/components/AdminAuditLogPanel";

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

const fakeEntry = {
  id: "log1",
  action: "admin.created",
  actorEmail: "boss@earlydays.example",
  targetUid: "u2",
  targetEmail: "musa@earlydays.example",
  detail: "blog",
  createdAt: Date.now(),
};

beforeEach(() => {
  vi.clearAllMocks();
  fakeUser.getIdToken.mockResolvedValue("tok");
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AdminAuditLogPanel", () => {
  it("shows the login form when logged out", () => {
    useAuth.mockReturnValue({ user: null, loading: false });
    render(<AdminAuditLogPanel />);

    expect(screen.getByRole("button", { name: "Log In" })).toBeInTheDocument();
  });

  it("shows a loading state while auth is resolving", () => {
    useAuth.mockReturnValue({ user: null, loading: true });
    render(<AdminAuditLogPanel />);

    expect(screen.getByText("Checking login status…")).toBeInTheDocument();
  });

  it("fetches and renders audit log entries for a logged-in superadmin", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ entries: [fakeEntry] }) })
    );

    render(<AdminAuditLogPanel />);

    expect(await screen.findByText("admin.created")).toBeInTheDocument();
    expect(screen.getByText(/musa@earlydays.example/)).toBeInTheDocument();
    expect(screen.getByText("blog")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      "/api/admin/audit",
      expect.objectContaining({ headers: { Authorization: "Bearer tok" } })
    );
  });

  it("shows a not-authorized message on a 403", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 403, json: async () => ({ error: "Not authorized" }) })
    );

    render(<AdminAuditLogPanel />);

    expect(
      await screen.findByText("You’re logged in, but this account isn’t authorized to view the audit log.")
    ).toBeInTheDocument();
  });

  it("shows an empty state when there are no entries", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ entries: [] }) }));

    render(<AdminAuditLogPanel />);

    expect(await screen.findByText("No audit log entries yet.")).toBeInTheDocument();
  });

  it("exports only the search-filtered entries as a CSV download", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          entries: [
            fakeEntry,
            {
              id: "log2",
              action: "admin.disabled",
              actorEmail: "boss@earlydays.example",
              targetUid: "u3",
              targetEmail: "zainab@earlydays.example",
              detail: "",
              createdAt: Date.now(),
            },
          ],
        }),
      })
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

    render(<AdminAuditLogPanel />);
    await screen.findByText("admin.created");

    await userEvent.type(screen.getByLabelText("Search audit log"), "musa");

    const link = document.createElement("a");
    const clickSpy = vi.spyOn(link, "click").mockImplementation(() => {});
    const createElementSpy = vi.spyOn(document, "createElement").mockReturnValue(link);

    await userEvent.click(screen.getByRole("button", { name: "Export CSV" }));

    expect(clickSpy).toHaveBeenCalled();
    expect(link.download).toMatch(/^audit-log-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(capturedContent).toContain("admin.created");
    expect(capturedContent).not.toContain("admin.disabled");

    createElementSpy.mockRestore();
  });
});
