import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminParentsPanel from "@/components/AdminParentsPanel";

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

const fakeParent = {
  uid: "u1",
  guardianName: "Aisha Bello",
  email: "aisha@example.com",
  children: [{ id: "c1", name: "Zainab", stage: "N1" }],
  createdAt: Date.now(),
};

beforeEach(() => {
  vi.clearAllMocks();
  fakeUser.getIdToken.mockResolvedValue("tok");
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AdminParentsPanel", () => {
  it("shows the login form when logged out", () => {
    useAuth.mockReturnValue({ user: null, loading: false });
    render(<AdminParentsPanel />);

    expect(screen.getByRole("button", { name: "Log In" })).toBeInTheDocument();
  });

  it("shows a loading state while auth is resolving", () => {
    useAuth.mockReturnValue({ user: null, loading: true });
    render(<AdminParentsPanel />);

    expect(screen.getByText("Checking login status…")).toBeInTheDocument();
  });

  it("fetches and renders existing parent accounts for a logged-in user", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ parents: [fakeParent] }),
      })
    );

    render(<AdminParentsPanel />);

    expect(await screen.findByText("Aisha Bello")).toBeInTheDocument();
    expect(screen.getByText("Zainab (N1)")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      "/api/admin/parents",
      expect.objectContaining({ headers: { Authorization: "Bearer tok" } })
    );
  });

  it("adding and removing child rows updates the form", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ parents: [] }) })
    );

    render(<AdminParentsPanel />);
    await screen.findByText("No parent accounts yet.");

    expect(screen.getAllByPlaceholderText("Child's name")).toHaveLength(1);

    await userEvent.click(screen.getByRole("button", { name: "+ Add Child" }));
    expect(screen.getAllByPlaceholderText("Child's name")).toHaveLength(2);

    await userEvent.click(screen.getAllByRole("button", { name: "Remove" })[0]);
    expect(screen.getAllByPlaceholderText("Child's name")).toHaveLength(1);
  });

  it("creates a parent account and prepends it to the list with the invite banner", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ ...fakeParent, resetLink: "https://earlydays.example/reset", emailSent: true }),
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ parents: [] }) });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminParentsPanel />);
    await screen.findByText("No parent accounts yet.");

    await userEvent.type(screen.getByPlaceholderText("Guardian name"), "Aisha Bello");
    await userEvent.type(screen.getByPlaceholderText("Email"), "aisha@example.com");
    await userEvent.type(screen.getByPlaceholderText("Child's name"), "Zainab");
    await userEvent.click(screen.getByRole("button", { name: "Create Account" }));

    expect(await screen.findByText("Aisha Bello")).toBeInTheDocument();
    expect(screen.getByText("Account created — an invite email has been sent to the parent.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/parents",
      expect.objectContaining({
        method: "POST",
        headers: { Authorization: "Bearer tok", "Content-Type": "application/json" },
      })
    );
  });

  it("shows a duplicate-email error and keeps form values on a 409", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        return Promise.resolve({
          ok: false,
          status: 409,
          json: async () => ({ error: "A parent account with this email already exists" }),
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ parents: [] }) });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminParentsPanel />);
    await screen.findByText("No parent accounts yet.");

    await userEvent.type(screen.getByPlaceholderText("Guardian name"), "Aisha Bello");
    await userEvent.type(screen.getByPlaceholderText("Email"), "aisha@example.com");
    await userEvent.type(screen.getByPlaceholderText("Child's name"), "Zainab");
    await userEvent.click(screen.getByRole("button", { name: "Create Account" }));

    expect(await screen.findByText("A parent account with this email already exists")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Guardian name")).toHaveValue("Aisha Bello");
  });

  it("edits a parent's phone number and updates the list in place", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url === "/api/admin/parents/u1" && init?.method === "PATCH") {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ uid: "u1", guardianName: "Aisha Bello", phone: "0801234567", children: fakeParent.children }),
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ parents: [fakeParent] }) });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminParentsPanel />);
    const row = (await screen.findByText("Aisha Bello")).closest("li") as HTMLElement;

    await userEvent.click(within(row).getByRole("button", { name: "Edit" }));
    await userEvent.type(within(row).getByPlaceholderText("Phone (optional)"), "0801234567");
    await userEvent.click(within(row).getByRole("button", { name: "Save" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/parents/u1",
      expect.objectContaining({
        method: "PATCH",
        headers: { Authorization: "Bearer tok", "Content-Type": "application/json" },
      })
    );
    expect(await within(row).findByText(/0801234567/)).toBeInTheDocument();
    expect(within(row).queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
  });

  it("cancels an edit without sending a request", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ parents: [fakeParent] }) });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminParentsPanel />);
    const row = (await screen.findByText("Aisha Bello")).closest("li") as HTMLElement;

    await userEvent.click(within(row).getByRole("button", { name: "Edit" }));
    await userEvent.type(within(row).getByPlaceholderText("Phone (optional)"), "0801234567");
    await userEvent.click(within(row).getByRole("button", { name: "Cancel" }));

    expect(within(row).queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalledWith("/api/admin/parents/u1", expect.anything());
  });

  it("resends an invite and shows the banner on that row", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url === "/api/admin/parents/u1/resend-invite" && init?.method === "POST") {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ resetLink: "https://earlydays.example/reset2", emailSent: true }),
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ parents: [fakeParent] }) });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminParentsPanel />);
    const row = (await screen.findByText("Aisha Bello")).closest("li") as HTMLElement;

    await userEvent.click(within(row).getByRole("button", { name: "Resend Invite" }));

    expect(await within(row).findByText("A new invite email has been sent to the parent.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/parents/u1/resend-invite",
      expect.objectContaining({ method: "POST", headers: { Authorization: "Bearer tok" } })
    );
  });

  it("shows a not-authorized message on a 403", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 403, json: async () => ({ error: "Not authorized" }) })
    );

    render(<AdminParentsPanel />);

    expect(
      await screen.findByText("You’re logged in, but this account isn’t authorized to manage parent accounts.")
    ).toBeInTheDocument();
  });

  it("narrows the list by a child's name", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    const other = {
      uid: "u2",
      guardianName: "Chidi Okoye",
      email: "chidi@example.com",
      children: [{ id: "c2", name: "Emeka", stage: "P1" }],
      createdAt: Date.now(),
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ parents: [fakeParent, other] }) })
    );

    render(<AdminParentsPanel />);
    await screen.findByText("Aisha Bello");
    expect(screen.getByText("Chidi Okoye")).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("Search parent accounts"), "Emeka");

    expect(screen.getByText("Chidi Okoye")).toBeInTheDocument();
    expect(screen.queryByText("Aisha Bello")).not.toBeInTheDocument();
  });

  it("narrows the list by the stage filter", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    const other = {
      uid: "u2",
      guardianName: "Chidi Okoye",
      email: "chidi@example.com",
      children: [{ id: "c2", name: "Emeka", stage: "P1" }],
      createdAt: Date.now(),
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ parents: [fakeParent, other] }) })
    );

    render(<AdminParentsPanel />);
    await screen.findByText("Aisha Bello");

    await userEvent.selectOptions(screen.getByLabelText("Filter by stage"), "P1");

    expect(screen.getByText("Chidi Okoye")).toBeInTheDocument();
    expect(screen.queryByText("Aisha Bello")).not.toBeInTheDocument();
  });
});
