import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminTestimonialsPanel from "@/components/AdminTestimonialsPanel";

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

const sampleTestimonial = {
  id: "t1",
  quote: "Great school.",
  name: "Aisha B.",
  area: "Parent, Barnawa",
  initial: "A",
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

describe("AdminTestimonialsPanel", () => {
  it("shows the login form when logged out", () => {
    useAuth.mockReturnValue({ user: null, loading: false });
    render(<AdminTestimonialsPanel />);

    expect(screen.getByRole("button", { name: "Log In" })).toBeInTheDocument();
  });

  it("shows a loading state while auth is resolving", () => {
    useAuth.mockReturnValue({ user: null, loading: true });
    render(<AdminTestimonialsPanel />);

    expect(screen.getByText("Checking login status…")).toBeInTheDocument();
  });

  it("fetches and renders testimonials for a logged-in user", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ testimonials: [sampleTestimonial] }),
      })
    );

    render(<AdminTestimonialsPanel />);

    expect(await screen.findByText("Aisha B. · Parent, Barnawa")).toBeInTheDocument();
    expect(screen.getByText("Great school.")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      "/api/admin/testimonials",
      expect.objectContaining({ headers: { Authorization: "Bearer tok" } })
    );
  });

  it("creates a testimonial via the form", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        return Promise.resolve({ ok: true, status: 200, json: async () => sampleTestimonial });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ testimonials: [] }) });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminTestimonialsPanel />);

    await screen.findByText("No testimonials yet.");

    await userEvent.type(screen.getByPlaceholderText("Quote"), sampleTestimonial.quote);
    await userEvent.type(screen.getByPlaceholderText("Name (e.g. Aisha B.)"), sampleTestimonial.name);
    await userEvent.type(screen.getByPlaceholderText("Area (e.g. Parent, Barnawa)"), sampleTestimonial.area);
    await userEvent.type(screen.getByPlaceholderText("Avatar initial (e.g. A)"), sampleTestimonial.initial);
    await userEvent.click(screen.getByRole("button", { name: "Add Testimonial" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/testimonials",
      expect.objectContaining({
        method: "POST",
        headers: { Authorization: "Bearer tok", "Content-Type": "application/json" },
        body: JSON.stringify({
          quote: sampleTestimonial.quote,
          name: sampleTestimonial.name,
          area: sampleTestimonial.area,
          initial: sampleTestimonial.initial,
          order: 0,
        }),
      })
    );
    expect(await screen.findByText("Aisha B. · Parent, Barnawa")).toBeInTheDocument();
  });

  it("deletes a testimonial via the delete button", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "DELETE") {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ ok: true }) });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ testimonials: [sampleTestimonial] }) });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminTestimonialsPanel />);
    await screen.findByText("Aisha B. · Parent, Barnawa");
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/testimonials/t1",
      expect.objectContaining({ method: "DELETE", headers: { Authorization: "Bearer tok" } })
    );
    expect(screen.queryByText("Aisha B. · Parent, Barnawa")).not.toBeInTheDocument();
  });

  it("filters the list by search query", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    const otherTestimonial = { ...sampleTestimonial, id: "t2", quote: "Wonderful teachers.", name: "Bala C.", area: "Parent, Kawo" };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ testimonials: [sampleTestimonial, otherTestimonial] }),
      })
    );

    render(<AdminTestimonialsPanel />);
    await screen.findByText("Aisha B. · Parent, Barnawa");
    expect(screen.getByText("Bala C. · Parent, Kawo")).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("Search testimonials"), "wonderful");

    expect(screen.getByText("Bala C. · Parent, Kawo")).toBeInTheDocument();
    expect(screen.queryByText("Aisha B. · Parent, Barnawa")).not.toBeInTheDocument();
  });

  it("exports the loaded testimonials as a CSV download", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ testimonials: [sampleTestimonial] }),
      })
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

    render(<AdminTestimonialsPanel />);
    await screen.findByText("Aisha B. · Parent, Barnawa");

    const link = document.createElement("a");
    const clickSpy = vi.spyOn(link, "click").mockImplementation(() => {});
    const createElementSpy = vi.spyOn(document, "createElement").mockReturnValue(link);

    await userEvent.click(screen.getByRole("button", { name: "Export CSV" }));

    expect(clickSpy).toHaveBeenCalled();
    expect(link.download).toMatch(/^testimonials-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(capturedContent).toContain("Quote,Name,Area,Initial,Order,Created By,Created At");
    expect(capturedContent).toContain('Great school.,Aisha B.,"Parent, Barnawa",A,0,staff@earlydays.example');

    createElementSpy.mockRestore();
  });

  it("shows a not-authorized message on a 403", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 403, json: async () => ({ error: "Not authorized" }) })
    );

    render(<AdminTestimonialsPanel />);

    expect(
      await screen.findByText("You’re logged in, but this account isn’t authorized to manage testimonials.")
    ).toBeInTheDocument();
  });
});
