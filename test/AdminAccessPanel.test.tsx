import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminAccessPanel from "@/components/AdminAccessPanel";

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

const fakeAdmin = {
  uid: "u2",
  email: "musa@earlydays.example",
  displayName: "Musa Ibrahim",
  isSuperAdmin: false,
  areas: ["blog", "gallery"],
  createdAt: Date.now(),
  createdBy: "boss@earlydays.example",
  disabled: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  fakeUser.getIdToken.mockResolvedValue("tok");
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AdminAccessPanel", () => {
  it("shows the login form when logged out", () => {
    useAuth.mockReturnValue({ user: null, loading: false });
    render(<AdminAccessPanel />);

    expect(screen.getByRole("button", { name: "Log In" })).toBeInTheDocument();
  });

  it("shows a loading state while auth is resolving", () => {
    useAuth.mockReturnValue({ user: null, loading: true });
    render(<AdminAccessPanel />);

    expect(screen.getByText("Checking login status…")).toBeInTheDocument();
  });

  it("fetches and renders admin accounts for a logged-in superadmin", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ admins: [fakeAdmin] }) })
    );

    render(<AdminAccessPanel />);

    const row = (await screen.findByText("Musa Ibrahim")).closest("li") as HTMLElement;
    expect(within(row).getByText("blog")).toBeInTheDocument();
    expect(within(row).getByText("gallery")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      "/api/admin/access",
      expect.objectContaining({ headers: { Authorization: "Bearer tok" } })
    );
  });

  it("shows a not-authorized message on a 403", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 403, json: async () => ({ error: "Not authorized" }) })
    );

    render(<AdminAccessPanel />);

    expect(
      await screen.findByText("You’re logged in, but this account isn’t authorized to manage admin accounts.")
    ).toBeInTheDocument();
  });

  it("creates an admin and prepends it to the list with the invite banner", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ ...fakeAdmin, resetLink: "https://earlydays.example/reset", emailSent: true }),
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ admins: [] }) });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminAccessPanel />);
    await screen.findByText("No admin accounts yet.");

    await userEvent.type(screen.getByPlaceholderText("Display name"), "Musa Ibrahim");
    await userEvent.type(screen.getByPlaceholderText("Email"), "musa@earlydays.example");
    await userEvent.click(screen.getByRole("checkbox", { name: /^blog$/ }));
    await userEvent.click(screen.getByRole("button", { name: "Create Admin" }));

    expect(await screen.findByText("Musa Ibrahim")).toBeInTheDocument();
    expect(screen.getByText("Account created — an invite email has been sent.")).toBeInTheDocument();
    const postCall = fetchMock.mock.calls.find(([, init]) => init?.method === "POST");
    expect(postCall?.[0]).toBe("/api/admin/access");
    const body = JSON.parse((postCall?.[1]?.body as string) ?? "{}");
    expect(body).toMatchObject({ displayName: "Musa Ibrahim", email: "musa@earlydays.example", areas: ["blog"] });
  });

  it("edits an admin's areas and updates the list in place", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url === "/api/admin/access/u2" && init?.method === "PATCH") {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ uid: "u2" }) });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ admins: [fakeAdmin] }) });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminAccessPanel />);
    const row = (await screen.findByText("Musa Ibrahim")).closest("li") as HTMLElement;

    await userEvent.click(within(row).getByRole("button", { name: "Edit" }));
    await userEvent.click(within(row).getByRole("checkbox", { name: /^testimonials$/ }));
    await userEvent.click(within(row).getByRole("button", { name: "Save" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/access/u2",
      expect.objectContaining({ method: "PATCH" })
    );
    expect(within(row).queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
    expect(await within(row).findByText("testimonials")).toBeInTheDocument();
  });

  it("deactivates and reactivates an admin account", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url === "/api/admin/access/u2" && init?.method === "PATCH") {
        const body = JSON.parse(init.body as string) as { disabled: boolean };
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ uid: "u2", disabled: body.disabled }) });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ admins: [fakeAdmin] }) });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminAccessPanel />);
    const row = (await screen.findByText("Musa Ibrahim")).closest("li") as HTMLElement;

    await userEvent.click(within(row).getByRole("button", { name: "Deactivate" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/access/u2",
      expect.objectContaining({ method: "PATCH", body: JSON.stringify({ disabled: true }) })
    );
    expect(await within(row).findByText("Disabled")).toBeInTheDocument();
    expect(within(row).getByRole("button", { name: "Reactivate" })).toBeInTheDocument();
  });

  it("removes an admin account from the list", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url === "/api/admin/access/u2" && init?.method === "DELETE") {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ uid: "u2" }) });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ admins: [fakeAdmin] }) });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminAccessPanel />);
    const row = (await screen.findByText("Musa Ibrahim")).closest("li") as HTMLElement;

    await userEvent.click(within(row).getByRole("button", { name: "Remove" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/access/u2",
      expect.objectContaining({ method: "DELETE" })
    );
    expect(screen.queryByText("Musa Ibrahim")).not.toBeInTheDocument();
  });

  it("disables the deactivate and remove controls on the signed-in user's own row", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    const selfRow = { ...fakeAdmin, uid: "u1", displayName: "Boss", isSuperAdmin: true, areas: [] };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ admins: [selfRow, fakeAdmin] }) })
    );

    render(<AdminAccessPanel />);
    const row = (await screen.findByText("Boss")).closest("li") as HTMLElement;

    expect(within(row).getByRole("button", { name: "Deactivate" })).toBeDisabled();
    expect(within(row).getByRole("button", { name: "Remove" })).toBeDisabled();
  });
});
