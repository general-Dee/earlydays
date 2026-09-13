import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "firebase/auth";
import AdminAccessList from "@/components/AdminAccessList";

vi.mock("firebase/auth", () => ({
  signOut: vi.fn(),
}));

vi.mock("@/lib/firebase/client", () => ({
  getFirebaseAuth: () => "fake-auth",
}));

const fakeUser = {
  uid: "self-1",
  email: "staff@earlydays.example",
  getIdToken: vi.fn().mockResolvedValue("tok"),
} as unknown as User;

const otherAdmin = {
  uid: "other-1",
  displayName: "Bola Adeyemi",
  email: "bola@example.com",
  isSuperAdmin: false,
  areas: ["applications", "payments"],
  createdAt: new Date("2026-01-15T10:00:00.000Z").getTime(),
  createdBy: "self-1",
  disabled: false,
};

const selfAdmin = {
  uid: "self-1",
  displayName: "Staff Member",
  email: "staff@earlydays.example",
  isSuperAdmin: true,
  areas: [],
  createdAt: new Date("2026-01-01T10:00:00.000Z").getTime(),
  createdBy: "self-1",
  disabled: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  (fakeUser.getIdToken as ReturnType<typeof vi.fn>).mockResolvedValue("tok");
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AdminAccessList", () => {
  it("shows a loading state while admin accounts are being fetched", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));

    render(<AdminAccessList user={fakeUser} />);

    expect(screen.getByText("Loading admin accounts…")).toBeInTheDocument();
  });

  it("fetches and renders admin accounts", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ admins: [otherAdmin] }) })
    );

    render(<AdminAccessList user={fakeUser} />);

    expect(await screen.findByText("Bola Adeyemi")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      "/api/admin/access",
      expect.objectContaining({ headers: { Authorization: "Bearer tok" } })
    );
  });

  it("shows a not-authorized message on a 403", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 403, json: async () => ({ error: "Not authorized" }) })
    );

    render(<AdminAccessList user={fakeUser} />);

    expect(
      await screen.findByText("You’re logged in, but this account isn’t authorized to manage admin accounts.")
    ).toBeInTheDocument();
  });

  it("shows an error message when the fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) }));

    render(<AdminAccessList user={fakeUser} />);

    expect(await screen.findByText("Couldn’t load admin accounts. Please try again.")).toBeInTheDocument();
  });

  it("shows an empty state when there are no admin accounts", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ admins: [] }) }));

    render(<AdminAccessList user={fakeUser} />);

    expect(await screen.findByText("No admin accounts yet.")).toBeInTheDocument();
  });

  it("narrows the list by search text", async () => {
    const another = { ...otherAdmin, uid: "other-2", displayName: "Chidi Okoro", email: "chidi@example.com" };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ admins: [otherAdmin, another] }) })
    );

    render(<AdminAccessList user={fakeUser} />);
    await screen.findByText("Bola Adeyemi");
    expect(screen.getByText("Chidi Okoro")).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("Search admin accounts"), "Chidi");

    expect(screen.getByText("Chidi Okoro")).toBeInTheDocument();
    expect(screen.queryByText("Bola Adeyemi")).not.toBeInTheDocument();
  });

  it("exports the loaded admin accounts as a CSV download", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ admins: [otherAdmin] }) })
    );

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

    render(<AdminAccessList user={fakeUser} />);
    await screen.findByText("Bola Adeyemi");

    const link = document.createElement("a");
    const clickSpy = vi.spyOn(link, "click").mockImplementation(() => {});
    const createElementSpy = vi.spyOn(document, "createElement").mockReturnValue(link);

    await userEvent.click(screen.getByRole("button", { name: "Export CSV" }));

    expect(clickSpy).toHaveBeenCalled();
    expect(link.download).toMatch(/^admin-accounts-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(capturedContent).toContain("Bola Adeyemi");

    createElementSpy.mockRestore();
  });

  it("paginates when there are more records than fit on one page", async () => {
    const many = Array.from({ length: 21 }, (_, i) => ({
      ...otherAdmin,
      uid: `other-${i}`,
      displayName: `Admin ${i}`,
    }));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ admins: many }) }));

    render(<AdminAccessList user={fakeUser} />);
    await screen.findByText("Admin 0");

    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
    expect(screen.queryByText("Admin 20")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Next ›" }));

    expect(await screen.findByText("Admin 20")).toBeInTheDocument();
    expect(screen.queryByText("Admin 0")).not.toBeInTheDocument();
  });

  it("doesn't show pagination controls when everything fits on one page", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ admins: [otherAdmin] }) })
    );

    render(<AdminAccessList user={fakeUser} />);
    await screen.findByText("Bola Adeyemi");

    expect(screen.queryByText(/Page \d+ of \d+/)).not.toBeInTheDocument();
  });

  it("creates an admin account submitted through the form", async () => {
    const created = { ...otherAdmin, uid: "new-1", displayName: "New Admin", resetLink: null, emailSent: true };
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        return Promise.resolve({ ok: true, status: 200, json: async () => created });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ admins: [] }) });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminAccessList user={fakeUser} />);
    await screen.findByText("No admin accounts yet.");

    await userEvent.type(screen.getByPlaceholderText("Display name"), "New Admin");
    await userEvent.type(screen.getByPlaceholderText("Email"), "new@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Create Admin" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/access",
      expect.objectContaining({
        method: "POST",
        headers: { Authorization: "Bearer tok", "Content-Type": "application/json" },
      })
    );
    expect(await screen.findByText("New Admin")).toBeInTheDocument();
    expect(await screen.findByText("Account created — an invite email has been sent.")).toBeInTheDocument();
  });

  it("shows an error and keeps the form filled in when create fails", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        return Promise.resolve({ ok: false, status: 400, json: async () => ({ error: "Email already in use" }) });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ admins: [] }) });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminAccessList user={fakeUser} />);
    await screen.findByText("No admin accounts yet.");

    await userEvent.type(screen.getByPlaceholderText("Display name"), "New Admin");
    await userEvent.type(screen.getByPlaceholderText("Email"), "new@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Create Admin" }));

    expect(await screen.findByText("Email already in use")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Display name")).toHaveValue("New Admin");
  });

  it("toggles an admin account disabled via Deactivate, with rollback on failure", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "PATCH") {
        return Promise.resolve({ ok: false, status: 500, json: async () => ({ error: "fail" }) });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ admins: [otherAdmin] }) });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminAccessList user={fakeUser} />);
    await screen.findByText("Bola Adeyemi");

    const deactivateButtons = screen.getAllByRole("button", { name: "Deactivate" });
    await userEvent.click(deactivateButtons[0]);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/access/other-1",
      expect.objectContaining({ method: "PATCH", body: JSON.stringify({ disabled: true }) })
    );
    expect(await screen.findByText("fail")).toBeInTheDocument();
  });

  it("removes an admin account via the Remove button", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "DELETE") {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ ok: true }) });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ admins: [otherAdmin] }) });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminAccessList user={fakeUser} />);
    await screen.findByText("Bola Adeyemi");

    await userEvent.click(screen.getByRole("button", { name: "Remove" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/access/other-1",
      expect.objectContaining({ method: "DELETE" })
    );
    expect(screen.queryByText("Bola Adeyemi")).not.toBeInTheDocument();
  });

  it("disables Deactivate and Remove on the signed-in user's own row", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ admins: [selfAdmin, otherAdmin] }) })
    );

    render(<AdminAccessList user={fakeUser} />);
    await screen.findByText("Staff Member");

    const selfRow = screen.getByText("Staff Member").closest("li")!;
    expect(within(selfRow).getByRole("button", { name: "Deactivate" })).toBeDisabled();
    expect(within(selfRow).getByRole("button", { name: "Remove" })).toBeDisabled();

    const otherRow = screen.getByText("Bola Adeyemi").closest("li")!;
    expect(within(otherRow).getByRole("button", { name: "Deactivate" })).not.toBeDisabled();
    expect(within(otherRow).getByRole("button", { name: "Remove" })).not.toBeDisabled();
  });

  it("signs out via the Log Out button", async () => {
    const { signOut } = await import("firebase/auth");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ admins: [] }) }));

    render(<AdminAccessList user={fakeUser} />);
    await screen.findByText("No admin accounts yet.");

    await userEvent.click(screen.getByRole("button", { name: "Log Out" }));

    expect(signOut).toHaveBeenCalledWith("fake-auth");
  });
});
