import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminEventsPanel from "@/components/AdminEventsPanel";

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

const sampleEvent = {
  id: "e1",
  title: "Term Starts",
  date: "2026-09-01",
  tag: "All Stages",
  desc: "First day of the new term.",
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

describe("AdminEventsPanel", () => {
  it("shows the login form when logged out", () => {
    useAuth.mockReturnValue({ user: null, loading: false });
    render(<AdminEventsPanel />);

    expect(screen.getByRole("button", { name: "Log In" })).toBeInTheDocument();
  });

  it("shows a loading state while auth is resolving", () => {
    useAuth.mockReturnValue({ user: null, loading: true });
    render(<AdminEventsPanel />);

    expect(screen.getByText("Checking login status…")).toBeInTheDocument();
  });

  it("fetches and renders events for a logged-in user", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ events: [sampleEvent] }),
      })
    );

    render(<AdminEventsPanel />);

    expect(await screen.findByText("Term Starts")).toBeInTheDocument();
    expect(screen.getByText("First day of the new term.")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      "/api/admin/events",
      expect.objectContaining({ headers: { Authorization: "Bearer tok" } })
    );
  });

  it("creates an event via the form", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        return Promise.resolve({ ok: true, status: 200, json: async () => sampleEvent });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ events: [] }) });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminEventsPanel />);

    await screen.findByText("No events yet.");

    await userEvent.type(screen.getByPlaceholderText("Title"), sampleEvent.title);
    await userEvent.type(screen.getByPlaceholderText("Tag (e.g. All Stages, Nursery, Admissions)"), sampleEvent.tag);
    await userEvent.type(screen.getByPlaceholderText("Event details"), sampleEvent.desc);
    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    await userEvent.type(dateInput, "2026-09-01");
    await userEvent.click(screen.getByRole("button", { name: "Add Event" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/events",
      expect.objectContaining({
        method: "POST",
        headers: { Authorization: "Bearer tok", "Content-Type": "application/json" },
        body: JSON.stringify({
          title: sampleEvent.title,
          date: sampleEvent.date,
          tag: sampleEvent.tag,
          desc: sampleEvent.desc,
        }),
      })
    );
    expect(await screen.findByText("Term Starts")).toBeInTheDocument();
  });

  it("deletes an event", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "DELETE") {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ ok: true }) });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ events: [sampleEvent] }) });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminEventsPanel />);

    await screen.findByText("Term Starts");
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/events/e1",
      expect.objectContaining({ method: "DELETE", headers: { Authorization: "Bearer tok" } })
    );
    expect(screen.queryByText("Term Starts")).not.toBeInTheDocument();
  });

  it("shows a not-authorized message on a 403", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 403, json: async () => ({ error: "Not authorized" }) })
    );

    render(<AdminEventsPanel />);

    expect(
      await screen.findByText("You’re logged in, but this account isn’t authorized to manage events.")
    ).toBeInTheDocument();
  });
});
