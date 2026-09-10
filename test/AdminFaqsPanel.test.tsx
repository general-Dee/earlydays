import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminFaqsPanel from "@/components/AdminFaqsPanel";

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

const sampleFaq = {
  id: "f1",
  question: "What ages do you take?",
  answer: "Creche through Primary 6.",
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

describe("AdminFaqsPanel", () => {
  it("shows the login form when logged out", () => {
    useAuth.mockReturnValue({ user: null, loading: false });
    render(<AdminFaqsPanel />);

    expect(screen.getByRole("button", { name: "Log In" })).toBeInTheDocument();
  });

  it("shows a loading state while auth is resolving", () => {
    useAuth.mockReturnValue({ user: null, loading: true });
    render(<AdminFaqsPanel />);

    expect(screen.getByText("Checking login status…")).toBeInTheDocument();
  });

  it("fetches and renders FAQs for a logged-in admin", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ faqs: [sampleFaq] }) })
    );

    render(<AdminFaqsPanel />);

    expect(await screen.findByText("What ages do you take?")).toBeInTheDocument();
    expect(screen.getByText("Creche through Primary 6.")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      "/api/admin/faqs",
      expect.objectContaining({ headers: { Authorization: "Bearer tok" } })
    );
  });

  it("creates a FAQ via the form", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        return Promise.resolve({ ok: true, status: 200, json: async () => sampleFaq });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ faqs: [] }) });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminFaqsPanel />);
    await screen.findByText("No FAQs yet.");

    await userEvent.type(screen.getByPlaceholderText("Question"), sampleFaq.question);
    await userEvent.type(screen.getByPlaceholderText("Answer"), sampleFaq.answer);
    await userEvent.click(screen.getByRole("button", { name: "Add FAQ" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/faqs",
      expect.objectContaining({
        method: "POST",
        headers: { Authorization: "Bearer tok", "Content-Type": "application/json" },
        body: JSON.stringify({ question: sampleFaq.question, answer: sampleFaq.answer, order: 0 }),
      })
    );
    expect(await screen.findByText("What ages do you take?")).toBeInTheDocument();
  });

  it("edits a FAQ's question and updates the list in place", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url === "/api/admin/faqs/f1" && init?.method === "PATCH") {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ ...sampleFaq, question: "Updated question?" }),
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ faqs: [sampleFaq] }) });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminFaqsPanel />);
    const row = (await screen.findByText("What ages do you take?")).closest("li") as HTMLElement;

    await userEvent.click(within(row).getByRole("button", { name: "Edit" }));
    const questionInput = within(row).getByPlaceholderText("Question");
    await userEvent.clear(questionInput);
    await userEvent.type(questionInput, "Updated question?");
    await userEvent.click(within(row).getByRole("button", { name: "Save" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/faqs/f1",
      expect.objectContaining({ method: "PATCH" })
    );
    expect(within(row).queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
    expect(await within(row).findByText("Updated question?")).toBeInTheDocument();
  });

  it("deletes a FAQ via the delete button", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "DELETE") {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ ok: true }) });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ faqs: [sampleFaq] }) });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminFaqsPanel />);
    await screen.findByText("What ages do you take?");
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/faqs/f1",
      expect.objectContaining({ method: "DELETE", headers: { Authorization: "Bearer tok" } })
    );
    expect(screen.queryByText("What ages do you take?")).not.toBeInTheDocument();
  });

  it("filters the list by search query", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    const otherFaq = { ...sampleFaq, id: "f2", question: "Do you offer transport?", answer: "Yes, a school bus service." };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ faqs: [sampleFaq, otherFaq] }) })
    );

    render(<AdminFaqsPanel />);
    await screen.findByText("What ages do you take?");
    expect(screen.getByText("Do you offer transport?")).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("Search FAQs"), "transport");

    expect(screen.getByText("Do you offer transport?")).toBeInTheDocument();
    expect(screen.queryByText("What ages do you take?")).not.toBeInTheDocument();
  });

  it("exports the loaded FAQs as a CSV download", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ faqs: [sampleFaq] }) })
    );

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

    render(<AdminFaqsPanel />);
    await screen.findByText("What ages do you take?");

    const link = document.createElement("a");
    const clickSpy = vi.spyOn(link, "click").mockImplementation(() => {});
    const createElementSpy = vi.spyOn(document, "createElement").mockReturnValue(link);

    await userEvent.click(screen.getByRole("button", { name: "Export CSV" }));

    expect(clickSpy).toHaveBeenCalled();
    expect(link.download).toMatch(/^faqs-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(capturedContent).toContain("Question,Answer,Order,Created By,Created At");
    expect(capturedContent).toContain("What ages do you take?,Creche through Primary 6.,0,staff@earlydays.example");

    createElementSpy.mockRestore();
  });

  it("shows a not-authorized message on a 403", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 403, json: async () => ({ error: "Not authorized" }) })
    );

    render(<AdminFaqsPanel />);

    expect(
      await screen.findByText("You’re logged in, but this account isn’t authorized to manage FAQs.")
    ).toBeInTheDocument();
  });
});
