import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminGate, { AdminAccessProvider } from "@/components/AdminGate";
import type { AdminArea } from "@/lib/firebase/types";

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

const fakeUser = { uid: "u1", email: "staff@earlydays.example", getIdToken: vi.fn().mockResolvedValue("tok") };

function renderGated(area?: AdminArea) {
  return render(
    <AdminAccessProvider>
      <AdminGate area={area}>{() => <div>Protected Content</div>}</AdminGate>
    </AdminAccessProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  fakeUser.getIdToken.mockResolvedValue("tok");
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AdminGate", () => {
  it("shows a loading state while auth is resolving", () => {
    useAuth.mockReturnValue({ user: null, loading: true });
    renderGated("blog");

    expect(screen.getByText("Checking login status…")).toBeInTheDocument();
  });

  it("shows the login form when logged out", () => {
    useAuth.mockReturnValue({ user: null, loading: false });
    renderGated("blog");

    expect(screen.getByRole("button", { name: "Log In" })).toBeInTheDocument();
  });

  it("shows a checking-access state while /api/admin/me is in flight", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise(() => {}))
    );

    renderGated("blog");

    expect(await screen.findByText("Checking access…")).toBeInTheDocument();
  });

  it("shows a not-authorized message when the required area is missing", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ isSuperAdmin: false, areas: ["gallery"] }) })
    );

    renderGated("blog");

    expect(await screen.findByText(/isn.t authorized to view this area/)).toBeInTheDocument();
  });

  it("renders children when the required area is present", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ isSuperAdmin: false, areas: ["blog"] }) })
    );

    renderGated("blog");

    expect(await screen.findByText("Protected Content")).toBeInTheDocument();
  });

  it("renders children for a superadmin regardless of area, including when area is omitted", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ isSuperAdmin: true, areas: [] }) })
    );

    renderGated(undefined);

    expect(await screen.findByText("Protected Content")).toBeInTheDocument();
  });

  it("shows not-authorized when area is omitted and the caller isn't a superadmin", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ isSuperAdmin: false, areas: ["blog"] }) })
    );

    renderGated(undefined);

    expect(await screen.findByText(/isn.t authorized to view this area/)).toBeInTheDocument();
  });

  it("shows an error message when /api/admin/me responds non-OK", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 403, json: async () => ({}) }));

    renderGated("blog");

    expect(await screen.findByText(/Couldn.t confirm your admin access/)).toBeInTheDocument();
  });
});
