import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminApplicationsPanel from "@/components/AdminApplicationsPanel";

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

const sampleApplication = {
  id: "a1",
  childName: "Femi Okafor",
  childDob: "2021-03-01",
  desiredStage: "CR",
  guardianName: "Aisha Okafor",
  email: "a@b.com",
  phone: null,
  notes: "Loves music.",
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

describe("AdminApplicationsPanel", () => {
  it("shows the login form when logged out", () => {
    useAuth.mockReturnValue({ user: null, loading: false });
    render(<AdminApplicationsPanel />);

    expect(screen.getByRole("button", { name: "Log In" })).toBeInTheDocument();
  });

  it("shows a loading state while auth is resolving", () => {
    useAuth.mockReturnValue({ user: null, loading: true });
    render(<AdminApplicationsPanel />);

    expect(screen.getByText("Checking login status…")).toBeInTheDocument();
  });

  it("fetches and renders applications for a logged-in user", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ applications: [sampleApplication] }),
      })
    );

    render(<AdminApplicationsPanel />);

    expect(await screen.findByText(/Femi Okafor/)).toBeInTheDocument();
    expect(screen.getByText("Loves music.")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      "/api/admin/applications",
      expect.objectContaining({ headers: { Authorization: "Bearer tok" } })
    );
  });

  it("updates an application's status via the status control", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "PATCH") {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ ok: true }) });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ applications: [sampleApplication] }),
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminApplicationsPanel />);

    await screen.findByText(/Femi Okafor/);
    const select = screen.getByRole("combobox", { name: "Status for Femi Okafor" });
    await userEvent.selectOptions(select, "accepted");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/applications/a1",
      expect.objectContaining({
        method: "PATCH",
        headers: { Authorization: "Bearer tok", "Content-Type": "application/json" },
        body: JSON.stringify({ status: "accepted" }),
      })
    );
    expect(select).toHaveValue("accepted");
  });

  it("shows a not-authorized message on a 403", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 403, json: async () => ({ error: "Not authorized" }) })
    );

    render(<AdminApplicationsPanel />);

    expect(
      await screen.findByText("You’re logged in, but this account isn’t authorized to view applications.")
    ).toBeInTheDocument();
  });

  it("narrows the list by search text", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    const other = { ...sampleApplication, id: "a2", childName: "Bola Adeyemi", guardianName: "Chidi Adeyemi" };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ applications: [sampleApplication, other] }),
      })
    );

    render(<AdminApplicationsPanel />);
    await screen.findByText(/Femi Okafor/);
    expect(screen.getByText(/Bola Adeyemi/)).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("Search applications"), "Bola");

    expect(screen.getByText(/Bola Adeyemi/)).toBeInTheDocument();
    expect(screen.queryByText(/Femi Okafor/)).not.toBeInTheDocument();
  });

  it("narrows the list by the status filter", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    const accepted = { ...sampleApplication, id: "a2", childName: "Bola Adeyemi", status: "accepted" };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ applications: [sampleApplication, accepted] }),
      })
    );

    render(<AdminApplicationsPanel />);
    await screen.findByText(/Femi Okafor/);

    await userEvent.selectOptions(screen.getByLabelText("Filter by status"), "accepted");

    expect(screen.getByText(/Bola Adeyemi/)).toBeInTheDocument();
    expect(screen.queryByText(/Femi Okafor/)).not.toBeInTheDocument();
  });

  it("paginates when there are more records than fit on one page", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    const many = Array.from({ length: 21 }, (_, i) => ({
      ...sampleApplication,
      id: `a${i}`,
      childName: `Child ${i}`,
    }));
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ applications: many }) })
    );

    render(<AdminApplicationsPanel />);
    await screen.findByText(/Child 0 ·/);

    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
    expect(screen.queryByText(/Child 20 ·/)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Next ›" }));

    expect(await screen.findByText(/Child 20 ·/)).toBeInTheDocument();
    expect(screen.queryByText(/Child 0 ·/)).not.toBeInTheDocument();
  });

  it("doesn't show pagination controls when everything fits on one page", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ applications: [sampleApplication] }),
      })
    );

    render(<AdminApplicationsPanel />);
    await screen.findByText(/Femi Okafor/);

    expect(screen.queryByText(/Page \d+ of \d+/)).not.toBeInTheDocument();
  });

  it("adds an application submitted through the create form", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    const created = { ...sampleApplication, id: "a9", childName: "New Kid", guardianName: "New Guardian" };
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        return Promise.resolve({ ok: true, status: 200, json: async () => created });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ applications: [sampleApplication] }) });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminApplicationsPanel />);
    await screen.findByText(/Femi Okafor/);

    await userEvent.type(screen.getByPlaceholderText("Child's full name"), "New Kid");
    await userEvent.type(screen.getByLabelText("Child's date of birth"), "2022-01-01");
    await userEvent.type(screen.getByPlaceholderText("Guardian full name"), "New Guardian");
    await userEvent.type(screen.getByPlaceholderText("Email"), "new@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Add Application" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/applications",
      expect.objectContaining({
        method: "POST",
        headers: { Authorization: "Bearer tok", "Content-Type": "application/json" },
      })
    );
    expect(await screen.findByText(/New Kid/)).toBeInTheDocument();
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
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ applications: [sampleApplication] }) });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminApplicationsPanel />);
    await screen.findByText(/Femi Okafor/);

    // Email/phone are the only optional fields — leaving both blank triggers a
    // server-side 400 without the browser's own required-field validation blocking
    // submission first (unlike leaving a required field like child name empty).
    await userEvent.type(screen.getByPlaceholderText("Child's full name"), "New Kid");
    await userEvent.type(screen.getByLabelText("Child's date of birth"), "2022-01-01");
    await userEvent.type(screen.getByPlaceholderText("Guardian full name"), "New Guardian");
    await userEvent.click(screen.getByRole("button", { name: "Add Application" }));

    expect(await screen.findByText("Provide an email or phone number")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Child's full name")).toHaveValue("New Kid");
  });

  it("deletes an application via the delete button", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "DELETE") {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ ok: true }) });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ applications: [sampleApplication] }) });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminApplicationsPanel />);
    await screen.findByText(/Femi Okafor/);

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/applications/a1",
      expect.objectContaining({ method: "DELETE", headers: { Authorization: "Bearer tok" } })
    );
    expect(screen.queryByText(/Femi Okafor/)).not.toBeInTheDocument();
  });

  it("restores the application if delete fails", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "DELETE") {
        return Promise.resolve({ ok: false, status: 500, json: async () => ({ error: "fail" }) });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ applications: [sampleApplication] }) });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminApplicationsPanel />);
    await screen.findByText(/Femi Okafor/);

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(await screen.findByText(/Femi Okafor/)).toBeInTheDocument();
  });
});
