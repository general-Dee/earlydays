import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminSubscribersPanel from "@/components/AdminSubscribersPanel";

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

const fakeUser = { email: "staff@earlydays.example", getIdToken: vi.fn().mockResolvedValue("tok") };

const fakeSubscriber = {
  id: "s1",
  email: "parent@example.com",
  name: "Aisha",
  createdAt: new Date("2026-01-15T10:00:00.000Z").getTime(),
};

beforeEach(() => {
  vi.clearAllMocks();
  fakeUser.getIdToken.mockResolvedValue("tok");
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AdminSubscribersPanel", () => {
  it("shows the login form when logged out", () => {
    useAuth.mockReturnValue({ user: null, loading: false });
    render(<AdminSubscribersPanel />);

    expect(screen.getByRole("button", { name: "Log In" })).toBeInTheDocument();
  });

  it("shows a loading state while auth is resolving", () => {
    useAuth.mockReturnValue({ user: null, loading: true });
    render(<AdminSubscribersPanel />);

    expect(screen.getByText("Checking login status…")).toBeInTheDocument();
  });

  it("fetches and renders subscribers for a logged-in admin", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ subscribers: [fakeSubscriber] }) })
    );

    render(<AdminSubscribersPanel />);

    expect(await screen.findByText("parent@example.com")).toBeInTheDocument();
    expect(screen.getByText("Aisha")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      "/api/admin/subscribers",
      expect.objectContaining({ headers: { Authorization: "Bearer tok" } })
    );
  });

  it("shows a not-authorized message on a 403", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 403, json: async () => ({ error: "Not authorized" }) })
    );

    render(<AdminSubscribersPanel />);

    expect(
      await screen.findByText("You’re logged in, but this account isn’t authorized to view subscribers.")
    ).toBeInTheDocument();
  });

  it("removes a subscriber via the delete button", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url === "/api/admin/subscribers/s1" && init?.method === "DELETE") {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ subscribers: [fakeSubscriber] }) });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminSubscribersPanel />);
    await screen.findByText("parent@example.com");

    await userEvent.click(screen.getByRole("button", { name: "Remove" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/subscribers/s1",
      expect.objectContaining({ method: "DELETE" })
    );
    expect(screen.queryByText("parent@example.com")).not.toBeInTheDocument();
  });

  it("exports the loaded subscribers as a CSV download", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ subscribers: [fakeSubscriber] }) })
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

    render(<AdminSubscribersPanel />);
    await screen.findByText("parent@example.com");

    const link = document.createElement("a");
    const clickSpy = vi.spyOn(link, "click").mockImplementation(() => {});
    const createElementSpy = vi.spyOn(document, "createElement").mockReturnValue(link);

    await userEvent.click(screen.getByRole("button", { name: "Export CSV" }));

    expect(clickSpy).toHaveBeenCalled();
    expect(link.download).toMatch(/^subscribers-\d{4}-\d{2}-\d{2}\.csv$/);

    expect(capturedContent).toContain("Email,Name,Created At");
    expect(capturedContent).toContain("parent@example.com,Aisha,2026-01-15T10:00:00.000Z");

    createElementSpy.mockRestore();
  });
});
