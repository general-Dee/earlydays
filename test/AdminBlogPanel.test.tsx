import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminBlogPanel from "@/components/AdminBlogPanel";

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

const fakePost = {
  id: "p1",
  slug: "helping-a-shy-child",
  category: "Settling In",
  title: "Helping a shy child through the first week",
  excerpt: "Small routines that make drop-off easier for both of you.",
  body: ["Paragraph one.", "Paragraph two."],
  gradient: "linear-gradient(135deg,#232532,#292b31)",
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

describe("AdminBlogPanel", () => {
  it("shows the login form when logged out", () => {
    useAuth.mockReturnValue({ user: null, loading: false });
    render(<AdminBlogPanel />);

    expect(screen.getByRole("button", { name: "Log In" })).toBeInTheDocument();
  });

  it("shows a loading state while auth is resolving", () => {
    useAuth.mockReturnValue({ user: null, loading: true });
    render(<AdminBlogPanel />);

    expect(screen.getByText("Checking login status…")).toBeInTheDocument();
  });

  it("fetches and renders posts for a logged-in user", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ posts: [fakePost] }),
      })
    );

    render(<AdminBlogPanel />);

    expect(await screen.findByText("Helping a shy child through the first week · Settling In")).toBeInTheDocument();
    expect(screen.getByText("Small routines that make drop-off easier for both of you.")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      "/api/admin/blog",
      expect.objectContaining({ headers: { Authorization: "Bearer tok" } })
    );
  });

  it("creates a post and appends it to the list", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        return Promise.resolve({ ok: true, status: 200, json: async () => fakePost });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ posts: [] }) });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminBlogPanel />);
    await screen.findByText("No blog posts yet.");

    await userEvent.type(screen.getByPlaceholderText("Slug (e.g. helping-a-shy-child)"), "helping-a-shy-child");
    await userEvent.type(screen.getByPlaceholderText("Category"), "Settling In");
    await userEvent.type(screen.getByPlaceholderText("Title"), "Helping a shy child through the first week");
    await userEvent.type(screen.getByPlaceholderText("Excerpt"), "Small routines that make drop-off easier for both of you.");
    await userEvent.type(screen.getByPlaceholderText("Body — separate paragraphs with a blank line"), "Paragraph one.");
    await userEvent.click(screen.getByRole("button", { name: "Add Post" }));

    expect(await screen.findByText("Helping a shy child through the first week · Settling In")).toBeInTheDocument();
    const postCall = fetchMock.mock.calls.find(([, init]) => init?.method === "POST");
    expect(postCall?.[0]).toBe("/api/admin/blog");
    const body = postCall?.[1]?.body as FormData;
    expect(body.get("slug")).toBe("helping-a-shy-child");
    expect(body.get("category")).toBe("Settling In");
    expect(body.get("title")).toBe("Helping a shy child through the first week");
  });

  it("deletes a post via the delete button", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "DELETE") {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ ok: true }) });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ posts: [fakePost] }) });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminBlogPanel />);
    await screen.findByText("Helping a shy child through the first week · Settling In");
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/blog/p1",
      expect.objectContaining({ method: "DELETE", headers: { Authorization: "Bearer tok" } })
    );
    expect(screen.queryByText("Helping a shy child through the first week · Settling In")).not.toBeInTheDocument();
  });

  it("shows a not-authorized message on a 403", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 403, json: async () => ({ error: "Not authorized" }) })
    );

    render(<AdminBlogPanel />);

    expect(
      await screen.findByText("You’re logged in, but this account isn’t authorized to manage blog posts.")
    ).toBeInTheDocument();
  });
});
