import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminInquiriesPanel from "@/components/AdminInquiriesPanel";

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

const sampleInquiry = {
  id: "i1",
  name: "Aisha",
  email: "a@b.com",
  phone: null,
  message: "Book a tour",
  status: "new",
  createdAt: Date.now(),
};

beforeEach(() => {
  vi.clearAllMocks();
  fakeUser.getIdToken.mockResolvedValue("tok");
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AdminInquiriesPanel", () => {
  it("shows the login form when logged out", () => {
    useAuth.mockReturnValue({ user: null, loading: false });
    render(<AdminInquiriesPanel />);

    expect(screen.getByRole("button", { name: "Log In" })).toBeInTheDocument();
  });

  it("shows a loading state while auth is resolving", () => {
    useAuth.mockReturnValue({ user: null, loading: true });
    render(<AdminInquiriesPanel />);

    expect(screen.getByText("Checking login status…")).toBeInTheDocument();
  });

  it("fetches and renders inquiries for a logged-in user", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          inquiries: [
            { id: "i1", name: "Aisha", email: "a@b.com", phone: null, message: "Book a tour", status: "new", createdAt: Date.now() },
          ],
        }),
      })
    );

    render(<AdminInquiriesPanel />);

    expect(await screen.findByText("Aisha")).toBeInTheDocument();
    expect(screen.getByText("Book a tour")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      "/api/admin/inquiries",
      expect.objectContaining({ headers: { Authorization: "Bearer tok" } })
    );
  });

  it("updates an inquiry's status via the status control", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "PATCH") {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ ok: true }) });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          inquiries: [
            { id: "i1", name: "Aisha", email: "a@b.com", phone: null, message: "Book a tour", status: "new", createdAt: Date.now() },
          ],
        }),
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminInquiriesPanel />);

    await screen.findByText("Aisha");
    const select = screen.getByRole("combobox", { name: "Status for Aisha" });
    await userEvent.selectOptions(select, "contacted");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/inquiries/i1",
      expect.objectContaining({
        method: "PATCH",
        headers: { Authorization: "Bearer tok", "Content-Type": "application/json" },
        body: JSON.stringify({ status: "contacted" }),
      })
    );
    expect(select).toHaveValue("contacted");
  });

  it("shows a not-authorized message on a 403", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 403, json: async () => ({ error: "Not authorized" }) })
    );

    render(<AdminInquiriesPanel />);

    expect(
      await screen.findByText("You’re logged in, but this account isn’t authorized to view inquiries.")
    ).toBeInTheDocument();
  });

  it("narrows the list by search text", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          inquiries: [
            { id: "i1", name: "Aisha", email: "a@b.com", phone: null, message: "Book a tour", status: "new", createdAt: Date.now() },
            { id: "i2", name: "Chidi", email: "c@d.com", phone: null, message: "Fee question", status: "new", createdAt: Date.now() },
          ],
        }),
      })
    );

    render(<AdminInquiriesPanel />);
    await screen.findByText("Aisha");
    expect(screen.getByText("Chidi")).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("Search inquiries"), "Chidi");

    expect(screen.getByText("Chidi")).toBeInTheDocument();
    expect(screen.queryByText("Aisha")).not.toBeInTheDocument();
  });

  it("narrows the list by the status filter", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          inquiries: [
            { id: "i1", name: "Aisha", email: "a@b.com", phone: null, message: "Book a tour", status: "new", createdAt: Date.now() },
            { id: "i2", name: "Chidi", email: "c@d.com", phone: null, message: "Fee question", status: "resolved", createdAt: Date.now() },
          ],
        }),
      })
    );

    render(<AdminInquiriesPanel />);
    await screen.findByText("Aisha");

    await userEvent.selectOptions(screen.getByLabelText("Filter by status"), "resolved");

    expect(screen.getByText("Chidi")).toBeInTheDocument();
    expect(screen.queryByText("Aisha")).not.toBeInTheDocument();
  });

  it("adds an inquiry submitted through the create form", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    const created = { ...sampleInquiry, id: "i9", name: "New Visitor" };
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        return Promise.resolve({ ok: true, status: 200, json: async () => created });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ inquiries: [sampleInquiry] }) });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminInquiriesPanel />);
    await screen.findByText("Aisha");

    await userEvent.type(screen.getByPlaceholderText("Name"), "New Visitor");
    await userEvent.type(screen.getByPlaceholderText("Message"), "Interested in a tour");
    await userEvent.type(screen.getByPlaceholderText("Email"), "visitor@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Add Inquiry" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/inquiries",
      expect.objectContaining({
        method: "POST",
        headers: { Authorization: "Bearer tok", "Content-Type": "application/json" },
      })
    );
    expect(await screen.findByText("New Visitor")).toBeInTheDocument();
  });

  it("shows an error and keeps the form filled in when create fails", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        return Promise.resolve({
          ok: false,
          status: 400,
          json: async () => ({ error: "Provide an email or phone number" }),
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ inquiries: [sampleInquiry] }) });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminInquiriesPanel />);
    await screen.findByText("Aisha");

    // Email/phone are the only optional fields — leaving both blank triggers a
    // server-side 400 without the browser's own required-field validation blocking
    // submission first (unlike leaving name or message empty).
    await userEvent.type(screen.getByPlaceholderText("Name"), "New Visitor");
    await userEvent.type(screen.getByPlaceholderText("Message"), "Interested in a tour");
    await userEvent.click(screen.getByRole("button", { name: "Add Inquiry" }));

    expect(await screen.findByText("Provide an email or phone number")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Name")).toHaveValue("New Visitor");
  });

  it("deletes an inquiry via the delete button", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "DELETE") {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ ok: true }) });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ inquiries: [sampleInquiry] }) });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminInquiriesPanel />);
    await screen.findByText("Aisha");

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/inquiries/i1",
      expect.objectContaining({ method: "DELETE", headers: { Authorization: "Bearer tok" } })
    );
    expect(screen.queryByText("Aisha")).not.toBeInTheDocument();
  });

  it("restores the inquiry if delete fails", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "DELETE") {
        return Promise.resolve({ ok: false, status: 500, json: async () => ({ error: "fail" }) });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ inquiries: [sampleInquiry] }) });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminInquiriesPanel />);
    await screen.findByText("Aisha");

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(await screen.findByText("Aisha")).toBeInTheDocument();
  });
});
