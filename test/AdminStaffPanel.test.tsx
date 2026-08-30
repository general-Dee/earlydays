import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminStaffPanel from "@/components/AdminStaffPanel";

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

const fakeUser = { email: "staff@earlydays.example", getIdToken: vi.fn().mockResolvedValue("tok") };

const fakeStaff = {
  id: "s1",
  name: "Mrs. Grace A.",
  role: "Head of Nursery",
  bio: "Eight years of nursery experience.",
  order: 0,
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

describe("AdminStaffPanel", () => {
  it("shows the login form when logged out", () => {
    useAuth.mockReturnValue({ user: null, loading: false });
    render(<AdminStaffPanel />);

    expect(screen.getByRole("button", { name: "Log In" })).toBeInTheDocument();
  });

  it("shows a loading state while auth is resolving", () => {
    useAuth.mockReturnValue({ user: null, loading: true });
    render(<AdminStaffPanel />);

    expect(screen.getByText("Checking login status…")).toBeInTheDocument();
  });

  it("fetches and renders staff for a logged-in user", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ staff: [fakeStaff] }),
      })
    );

    render(<AdminStaffPanel />);

    expect(await screen.findByText("Mrs. Grace A. · Head of Nursery")).toBeInTheDocument();
    expect(screen.getByText("Eight years of nursery experience.")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      "/api/admin/staff",
      expect.objectContaining({ headers: { Authorization: "Bearer tok" } })
    );
  });

  it("creates a staff member and appends it to the list", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        return Promise.resolve({ ok: true, status: 200, json: async () => fakeStaff });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ staff: [] }) });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminStaffPanel />);
    await screen.findByText("No staff profiles yet.");

    await userEvent.type(screen.getByPlaceholderText("Name"), "Mrs. Grace A.");
    await userEvent.type(screen.getByPlaceholderText("Role"), "Head of Nursery");
    await userEvent.type(screen.getByPlaceholderText("Bio"), "Eight years of nursery experience.");
    await userEvent.click(screen.getByRole("button", { name: "Add Staff Member" }));

    expect(await screen.findByText("Mrs. Grace A. · Head of Nursery")).toBeInTheDocument();
    const postCall = fetchMock.mock.calls.find(([, init]) => init?.method === "POST");
    expect(postCall?.[0]).toBe("/api/admin/staff");
    const body = postCall?.[1]?.body as FormData;
    expect(body.get("name")).toBe("Mrs. Grace A.");
    expect(body.get("role")).toBe("Head of Nursery");
    expect(body.get("bio")).toBe("Eight years of nursery experience.");
  });

  it("deletes a staff member via the delete button", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "DELETE") {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ ok: true }) });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ staff: [fakeStaff] }) });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminStaffPanel />);
    await screen.findByText("Mrs. Grace A. · Head of Nursery");
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/staff/s1",
      expect.objectContaining({ method: "DELETE", headers: { Authorization: "Bearer tok" } })
    );
    expect(screen.queryByText("Mrs. Grace A. · Head of Nursery")).not.toBeInTheDocument();
  });

  it("shows a not-authorized message on a 403", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 403, json: async () => ({ error: "Not authorized" }) })
    );

    render(<AdminStaffPanel />);

    expect(
      await screen.findByText("You’re logged in, but this account isn’t authorized to manage staff profiles.")
    ).toBeInTheDocument();
  });
});
