import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminRateLimitsPanel from "@/components/AdminRateLimitsPanel";

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

const fakeBucket = { key: "contact:1.2.3.4", count: 3, resetAt: Date.now() + 60_000 };

beforeEach(() => {
  vi.clearAllMocks();
  fakeUser.getIdToken.mockResolvedValue("tok");
});

describe("AdminRateLimitsPanel", () => {
  it("shows the login form when logged out", () => {
    useAuth.mockReturnValue({ user: null, loading: false });
    render(<AdminRateLimitsPanel />);

    expect(screen.getByRole("button", { name: "Log In" })).toBeInTheDocument();
  });

  it("shows a loading state while auth is resolving", () => {
    useAuth.mockReturnValue({ user: null, loading: true });
    render(<AdminRateLimitsPanel />);

    expect(screen.getByText("Checking login status…")).toBeInTheDocument();
  });

  it("fetches and renders rate-limit buckets for a logged-in superadmin", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ buckets: [fakeBucket] }) })
    );

    render(<AdminRateLimitsPanel />);

    expect(await screen.findByText("contact:1.2.3.4")).toBeInTheDocument();
    expect(screen.getByText("3 requests")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      "/api/admin/rate-limits",
      expect.objectContaining({ headers: { Authorization: "Bearer tok" } })
    );
  });

  it("shows a not-authorized message on a 403", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 403, json: async () => ({ error: "Not authorized" }) })
    );

    render(<AdminRateLimitsPanel />);

    expect(
      await screen.findByText("You’re logged in, but this account isn’t authorized to view rate limits.")
    ).toBeInTheDocument();
  });

  it("shows an empty state when there are no active buckets", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ buckets: [] }) }));

    render(<AdminRateLimitsPanel />);

    expect(await screen.findByText("No active rate-limit buckets.")).toBeInTheDocument();
  });
});
