import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminNav from "@/components/AdminNav";
import { AdminAccessProvider } from "@/components/AdminGate";

const useAuth = vi.fn();
const usePathname = vi.fn();

vi.mock("@/lib/firebase/AuthProvider", () => ({
  useAuth: () => useAuth(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => usePathname(),
}));

const fakeUser = { uid: "u1", email: "staff@earlydays.example", getIdToken: vi.fn().mockResolvedValue("tok") };

function renderNav() {
  return render(
    <AdminAccessProvider>
      <AdminNav />
    </AdminAccessProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  usePathname.mockReturnValue("/admin");
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AdminNav", () => {
  it("renders nothing until access is resolved", () => {
    useAuth.mockReturnValue({ user: null, loading: true });
    const { container } = renderNav();

    expect(container).toBeEmptyDOMElement();
  });

  it("shows only the areas a non-superadmin has access to", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ isSuperAdmin: false, areas: ["blog", "faqs"] }) })
    );

    renderNav();

    expect(await screen.findByRole("link", { name: "Blog" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "FAQs" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Admin Access" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Payments" })).not.toBeInTheDocument();
  });

  it("shows every area, including superadmin-only ones, for a superadmin", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ isSuperAdmin: true, areas: [] }) })
    );

    renderNav();

    expect(await screen.findByRole("link", { name: "Admin Access" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Site Settings" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Payments" })).toBeInTheDocument();
  });

  it("marks the current page's link active", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    usePathname.mockReturnValue("/admin/blog");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ isSuperAdmin: true, areas: [] }) })
    );

    renderNav();

    expect(await screen.findByRole("link", { name: "Blog" })).toHaveClass("btn-primary");
    expect(screen.getByRole("link", { name: "Dashboard" })).not.toHaveClass("btn-primary");
  });
});
