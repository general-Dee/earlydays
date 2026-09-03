import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminAnnouncementsPanel from "@/components/AdminAnnouncementsPanel";

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

const fakeAnnouncement = {
  id: "a1",
  title: "Closed Friday",
  body: "School closed for a holiday",
  createdBy: "staff@earlydays.example",
  createdAt: Date.now(),
};

beforeEach(() => {
  vi.clearAllMocks();
  fakeUser.getIdToken.mockResolvedValue("tok");
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AdminAnnouncementsPanel", () => {
  it("shows the login form when logged out", () => {
    useAuth.mockReturnValue({ user: null, loading: false });
    render(<AdminAnnouncementsPanel />);

    expect(screen.getByRole("button", { name: "Log In" })).toBeInTheDocument();
  });

  it("shows a loading state while auth is resolving", () => {
    useAuth.mockReturnValue({ user: null, loading: true });
    render(<AdminAnnouncementsPanel />);

    expect(screen.getByText("Checking login status…")).toBeInTheDocument();
  });

  it("fetches and renders announcements for a logged-in user", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ announcements: [fakeAnnouncement] }),
      })
    );

    render(<AdminAnnouncementsPanel />);

    expect(await screen.findByText("Closed Friday")).toBeInTheDocument();
    expect(screen.getByText("School closed for a holiday")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      "/api/admin/announcements",
      expect.objectContaining({ headers: { Authorization: "Bearer tok" } })
    );
  });

  it("posts a new announcement and prepends it to the list", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ ...fakeAnnouncement, id: "a2", title: "New Notice", body: "Details here" }),
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ announcements: [] }) });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminAnnouncementsPanel />);

    await screen.findByText("No announcements yet.");

    await userEvent.type(screen.getByPlaceholderText("Title"), "New Notice");
    await userEvent.type(screen.getByPlaceholderText("Announcement details"), "Details here");
    await userEvent.click(screen.getByRole("button", { name: "Post Announcement" }));

    expect(await screen.findByText("New Notice")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/announcements",
      expect.objectContaining({
        method: "POST",
        headers: { Authorization: "Bearer tok", "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New Notice", body: "Details here" }),
      })
    );
  });

  it("deletes an announcement via the delete button", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "DELETE") {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ ok: true }) });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ announcements: [fakeAnnouncement] }) });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminAnnouncementsPanel />);

    await screen.findByText("Closed Friday");
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/announcements/a1",
      expect.objectContaining({ method: "DELETE", headers: { Authorization: "Bearer tok" } })
    );
    expect(screen.queryByText("Closed Friday")).not.toBeInTheDocument();
  });

  it("shows a not-authorized message on a 403", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 403, json: async () => ({ error: "Not authorized" }) })
    );

    render(<AdminAnnouncementsPanel />);

    expect(
      await screen.findByText("You’re logged in, but this account isn’t authorized to manage announcements.")
    ).toBeInTheDocument();
  });
});
