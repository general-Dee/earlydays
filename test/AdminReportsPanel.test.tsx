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
  createdAt: Date.parse("2026-01-15T10:00:00.000Z"),
};

const otherFakeReport = {
  id: "r2",
  childId: "c1",
  childName: "Zainab",
  term: "Term 1",
  fileName: "midterm.pdf",
  storagePath: "reports/u1/r2.pdf",
  uploadedBy: "staff@earlydays.example",
  createdAt: Date.parse("2026-02-01T10:00:00.000Z"),
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

  it("filters reports by search text", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url === "/api/admin/reports") {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ parents: [fakeParent] }) });
      }
      if (url === "/api/admin/reports/u1") {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ reports: [fakeReport, otherFakeReport] }),
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminReportsPanel />);

    const select = await screen.findByDisplayValue("Select a parent…");
    await userEvent.selectOptions(select, "u1");

    expect(await screen.findByText("report.pdf")).toBeInTheDocument();
    expect(screen.getByText("midterm.pdf")).toBeInTheDocument();

    await userEvent.type(screen.getByPlaceholderText("Search by child, term, or file name…"), "Term 3");

    expect(screen.getByText("report.pdf")).toBeInTheDocument();
    expect(screen.queryByText("midterm.pdf")).not.toBeInTheDocument();
  });

  it("exports the selected parent's reports as a CSV download", async () => {
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

    // jsdom's Blob shim doesn't implement .text()/.arrayBuffer(), so capture
    // the CSV content at construction time instead of reading it back off a Blob.
    let capturedContent = "";
    const RealBlob = globalThis.Blob;
    vi.stubGlobal(
      "Blob",
      vi.fn((parts: BlobPart[], options?: BlobPropertyBag) => {
        capturedContent = parts.join("");
        return new RealBlob(parts, options);
      })
    );
    URL.createObjectURL = vi.fn(() => "blob:fake-url");
    URL.revokeObjectURL = vi.fn();

    render(<AdminReportsPanel />);

    const select = await screen.findByDisplayValue("Select a parent…");
    await userEvent.selectOptions(select, "u1");
    await screen.findByText("report.pdf");

    const link = document.createElement("a");
    const clickSpy = vi.spyOn(link, "click").mockImplementation(() => {});
    const createElementSpy = vi.spyOn(document, "createElement").mockReturnValue(link);

    await userEvent.click(screen.getByRole("button", { name: "Export CSV" }));

    expect(clickSpy).toHaveBeenCalled();
    expect(link.download).toMatch(/^reports-\d{4}-\d{2}-\d{2}\.csv$/);

    expect(capturedContent).toContain("Child,Term,File Name,Uploaded By,Uploaded At");
    expect(capturedContent).toContain("Zainab,Term 3,report.pdf,staff@earlydays.example,2026-01-15T10:00:00.000Z");

    createElementSpy.mockRestore();
  });
});
