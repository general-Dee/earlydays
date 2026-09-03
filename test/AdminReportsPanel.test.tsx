import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminReportsPanel from "@/components/AdminReportsPanel";

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

const fakeParent = {
  uid: "u1",
  guardianName: "Aisha Bello",
  email: "aisha@example.com",
  children: [{ id: "c1", name: "Zainab", stage: "N1" }],
};

const fakeReport = {
  id: "r1",
  childId: "c1",
  childName: "Zainab",
  term: "Term 3",
  fileName: "report.pdf",
  storagePath: "reports/u1/r1.pdf",
  uploadedBy: "staff@earlydays.example",
  createdAt: Date.now(),
};

beforeEach(() => {
  vi.clearAllMocks();
  fakeUser.getIdToken.mockResolvedValue("tok");
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AdminReportsPanel", () => {
  it("shows the login form when logged out", () => {
    useAuth.mockReturnValue({ user: null, loading: false });
    render(<AdminReportsPanel />);

    expect(screen.getByRole("button", { name: "Log In" })).toBeInTheDocument();
  });

  it("shows a loading state while auth is resolving", () => {
    useAuth.mockReturnValue({ user: null, loading: true });
    render(<AdminReportsPanel />);

    expect(screen.getByText("Checking login status…")).toBeInTheDocument();
  });

  it("shows a not-authorized message on a 403", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 403, json: async () => ({}) }));

    render(<AdminReportsPanel />);

    expect(
      await screen.findByText("You’re logged in, but this account isn’t authorized to manage progress reports.")
    ).toBeInTheDocument();
  });

  it("lists parents and loads a selected parent's reports", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url === "/api/admin/reports") {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ parents: [fakeParent] }) });
      }
      if (url === "/api/admin/reports/u1") {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ reports: [fakeReport] }) });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminReportsPanel />);

    const select = await screen.findByDisplayValue("Select a parent…");
    await userEvent.selectOptions(select, "u1");

    expect(await screen.findByText("report.pdf")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/reports/u1",
      expect.objectContaining({ headers: { Authorization: "Bearer tok" } })
    );
  });

  it("uploads a report and prepends it to the list", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url === "/api/admin/reports" && init?.method === "POST") {
        return Promise.resolve({ ok: true, status: 200, json: async () => fakeReport });
      }
      if (url === "/api/admin/reports") {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ parents: [fakeParent] }) });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ reports: [] }) });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminReportsPanel />);

    const select = await screen.findByDisplayValue("Select a parent…");
    await userEvent.selectOptions(select, "u1");
    await screen.findByText("No reports uploaded for this parent yet.");

    const file = new File(["%PDF-1.4"], "report.pdf", { type: "application/pdf" });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(fileInput, file);
    // fireEvent.submit bypasses native constraint validation, which jsdom
    // doesn't reliably clear on a required file input after userEvent.upload.
    fireEvent.submit(screen.getByRole("button", { name: "Upload Report" }).closest("form") as HTMLFormElement);

    expect(await screen.findByText("report.pdf")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/reports",
      expect.objectContaining({ method: "POST", headers: { Authorization: "Bearer tok" } })
    );
  });

  it("optimistically removes a report on delete and rolls back on failure", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url === "/api/admin/reports/u1/r1" && init?.method === "DELETE") {
        return Promise.resolve({ ok: false, status: 500, json: async () => ({}) });
      }
      if (url === "/api/admin/reports") {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ parents: [fakeParent] }) });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ reports: [fakeReport] }) });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminReportsPanel />);

    const select = await screen.findByDisplayValue("Select a parent…");
    await userEvent.selectOptions(select, "u1");
    await screen.findByText("report.pdf");

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(await screen.findByText("report.pdf")).toBeInTheDocument();
  });
});
