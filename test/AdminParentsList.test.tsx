import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "firebase/auth";
import AdminParentsList from "@/components/AdminParentsList";

vi.mock("firebase/auth", () => ({
  signOut: vi.fn(),
}));

vi.mock("@/lib/firebase/client", () => ({
  getFirebaseAuth: () => "fake-auth",
}));

const fakeUser = {
  email: "staff@earlydays.example",
  getIdToken: vi.fn().mockResolvedValue("tok"),
} as unknown as User;

const sampleParent = {
  uid: "p1",
  guardianName: "Aisha Okafor",
  email: "aisha@example.com",
  phone: "08010000000",
  children: [{ id: "c1", name: "Femi Okafor", stage: "CR", admissionNo: "A-1" }],
  createdAt: new Date("2026-01-15T10:00:00.000Z").getTime(),
  disabled: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  (fakeUser.getIdToken as ReturnType<typeof vi.fn>).mockResolvedValue("tok");
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AdminParentsList", () => {
  it("shows a loading state while parent accounts are being fetched", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));

    render(<AdminParentsList user={fakeUser} />);

    expect(screen.getByText("Loading parent accounts…")).toBeInTheDocument();
  });

  it("fetches and renders parent accounts", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ parents: [sampleParent] }) })
    );

    render(<AdminParentsList user={fakeUser} />);

    expect(await screen.findByText("Aisha Okafor")).toBeInTheDocument();
    expect(screen.getByText("Femi Okafor (CR)")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      "/api/admin/parents",
      expect.objectContaining({ headers: { Authorization: "Bearer tok" } })
    );
  });

  it("shows a not-authorized message on a 403", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 403, json: async () => ({ error: "Not authorized" }) })
    );

    render(<AdminParentsList user={fakeUser} />);

    expect(
      await screen.findByText("You’re logged in, but this account isn’t authorized to manage parent accounts.")
    ).toBeInTheDocument();
  });

  it("shows an error message when the fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) }));

    render(<AdminParentsList user={fakeUser} />);

    expect(await screen.findByText("Couldn’t load parent accounts. Please try again.")).toBeInTheDocument();
  });

  it("shows an empty state when there are no parent accounts", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ parents: [] }) }));

    render(<AdminParentsList user={fakeUser} />);

    expect(await screen.findByText("No parent accounts yet.")).toBeInTheDocument();
  });

  it("narrows the list by search text", async () => {
    const other = {
      ...sampleParent,
      uid: "p2",
      guardianName: "Bola Adeyemi",
      email: "bola@example.com",
      children: [{ id: "c2", name: "Chidi Adeyemi", stage: "CR" }],
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ parents: [sampleParent, other] }) })
    );

    render(<AdminParentsList user={fakeUser} />);
    await screen.findByText("Aisha Okafor");
    expect(screen.getByText("Bola Adeyemi")).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("Search parent accounts"), "Bola");

    expect(screen.getByText("Bola Adeyemi")).toBeInTheDocument();
    expect(screen.queryByText("Aisha Okafor")).not.toBeInTheDocument();
  });

  it("narrows the list by the stage filter", async () => {
    const other = {
      ...sampleParent,
      uid: "p2",
      guardianName: "Bola Adeyemi",
      children: [{ id: "c2", name: "Chidi Adeyemi", stage: "P1" }],
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ parents: [sampleParent, other] }) })
    );

    render(<AdminParentsList user={fakeUser} />);
    await screen.findByText("Aisha Okafor");

    await userEvent.selectOptions(screen.getByLabelText("Filter by stage"), "P1");

    expect(screen.getByText("Bola Adeyemi")).toBeInTheDocument();
    expect(screen.queryByText("Aisha Okafor")).not.toBeInTheDocument();
  });

  it("exports the loaded parent accounts as a CSV download", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ parents: [sampleParent] }) })
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

    render(<AdminParentsList user={fakeUser} />);
    await screen.findByText("Aisha Okafor");

    const link = document.createElement("a");
    const clickSpy = vi.spyOn(link, "click").mockImplementation(() => {});
    const createElementSpy = vi.spyOn(document, "createElement").mockReturnValue(link);

    await userEvent.click(screen.getByRole("button", { name: "Export CSV" }));

    expect(clickSpy).toHaveBeenCalled();
    expect(link.download).toMatch(/^parents-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(capturedContent).toContain("Aisha Okafor");
    expect(capturedContent).toContain("Femi Okafor");

    createElementSpy.mockRestore();
  });

  it("paginates when there are more records than fit on one page", async () => {
    const many = Array.from({ length: 21 }, (_, i) => ({
      ...sampleParent,
      uid: `p${i}`,
      guardianName: `Guardian ${i}`,
    }));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ parents: many }) }));

    render(<AdminParentsList user={fakeUser} />);
    await screen.findByText("Guardian 0");

    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
    expect(screen.queryByText("Guardian 20")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Next ›" }));

    expect(await screen.findByText("Guardian 20")).toBeInTheDocument();
    expect(screen.queryByText("Guardian 0")).not.toBeInTheDocument();
  });

  it("doesn't show pagination controls when everything fits on one page", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ parents: [sampleParent] }) })
    );

    render(<AdminParentsList user={fakeUser} />);
    await screen.findByText("Aisha Okafor");

    expect(screen.queryByText(/Page \d+ of \d+/)).not.toBeInTheDocument();
  });

  it("creates a parent account with a single child submitted through the form", async () => {
    const created = {
      ...sampleParent,
      uid: "new-1",
      guardianName: "New Guardian",
      resetLink: null,
      emailSent: true,
    };
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        return Promise.resolve({ ok: true, status: 200, json: async () => created });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ parents: [] }) });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminParentsList user={fakeUser} />);
    await screen.findByText("No parent accounts yet.");

    await userEvent.type(screen.getByPlaceholderText("Guardian name"), "New Guardian");
    await userEvent.type(screen.getByPlaceholderText("Email"), "new@example.com");
    await userEvent.type(screen.getByPlaceholderText("Child's name"), "New Child");
    await userEvent.click(screen.getByRole("button", { name: "Create Account" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/parents",
      expect.objectContaining({
        method: "POST",
        headers: { Authorization: "Bearer tok", "Content-Type": "application/json" },
      })
    );
    const postCall = fetchMock.mock.calls.find(([, init]) => init?.method === "POST");
    const body = JSON.parse((postCall?.[1]?.body as string) ?? "{}");
    expect(body.children).toEqual([{ name: "New Child", stage: "CR", admissionNo: "" }]);

    expect(await screen.findByText("New Guardian")).toBeInTheDocument();
    expect(
      await screen.findByText("Account created — an invite email has been sent to the parent.")
    ).toBeInTheDocument();
  });

  it("adds and removes child rows in the create form", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ parents: [] }) }));

    render(<AdminParentsList user={fakeUser} />);
    await screen.findByText("No parent accounts yet.");

    expect(screen.getAllByPlaceholderText("Child's name")).toHaveLength(1);

    await userEvent.click(screen.getByRole("button", { name: "+ Add Child" }));
    expect(screen.getAllByPlaceholderText("Child's name")).toHaveLength(2);

    const removeButtons = screen.getAllByRole("button", { name: "Remove" });
    await userEvent.click(removeButtons[0]);
    expect(screen.getAllByPlaceholderText("Child's name")).toHaveLength(1);
  });

  it("shows an error and keeps the form filled in when create fails", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        return Promise.resolve({ ok: false, status: 400, json: async () => ({ error: "Email already in use" }) });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ parents: [] }) });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminParentsList user={fakeUser} />);
    await screen.findByText("No parent accounts yet.");

    await userEvent.type(screen.getByPlaceholderText("Guardian name"), "New Guardian");
    await userEvent.type(screen.getByPlaceholderText("Email"), "new@example.com");
    await userEvent.type(screen.getByPlaceholderText("Child's name"), "New Child");
    await userEvent.click(screen.getByRole("button", { name: "Create Account" }));

    expect(await screen.findByText("Email already in use")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Guardian name")).toHaveValue("New Guardian");
  });

  it("resends an invite via the Resend Invite button", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url === "/api/admin/parents/p1/resend-invite" && init?.method === "POST") {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ resetLink: null, emailSent: true }) });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ parents: [sampleParent] }) });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminParentsList user={fakeUser} />);
    await screen.findByText("Aisha Okafor");

    await userEvent.click(screen.getByRole("button", { name: "Resend Invite" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/parents/p1/resend-invite",
      expect.objectContaining({ method: "POST", headers: { Authorization: "Bearer tok" } })
    );
    expect(await screen.findByText("A new invite email has been sent to the parent.")).toBeInTheDocument();
  });

  it("toggles a parent account disabled via Deactivate, with rollback on failure", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "PATCH") {
        return Promise.resolve({ ok: false, status: 500, json: async () => ({ error: "fail" }) });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ parents: [sampleParent] }) });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminParentsList user={fakeUser} />);
    await screen.findByText("Aisha Okafor");

    await userEvent.click(screen.getByRole("button", { name: "Deactivate" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/parents/p1",
      expect.objectContaining({ method: "PATCH", body: JSON.stringify({ disabled: true }) })
    );
    expect(await screen.findByText("fail")).toBeInTheDocument();
  });

  it("edits a parent account's nested child rows through the Edit form", async () => {
    const updated = {
      guardianName: "Aisha Okafor",
      email: "aisha@example.com",
      phone: "08010000000",
      children: [{ id: "c1", name: "Femi Renamed", stage: "CR", admissionNo: "A-1" }],
    };
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "PATCH") {
        return Promise.resolve({ ok: true, status: 200, json: async () => updated });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ parents: [sampleParent] }) });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminParentsList user={fakeUser} />);
    await screen.findByText("Aisha Okafor");

    await userEvent.click(screen.getByRole("button", { name: "Edit" }));

    const childNameInputs = screen.getAllByPlaceholderText("Child's name");
    await userEvent.clear(childNameInputs[0]);
    await userEvent.type(childNameInputs[0], "Femi Renamed");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/parents/p1",
      expect.objectContaining({ method: "PATCH" })
    );
    expect(await screen.findByText("Femi Renamed (CR)")).toBeInTheDocument();
  });

  it("signs out via the Log Out button", async () => {
    const { signOut } = await import("firebase/auth");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ parents: [] }) }));

    render(<AdminParentsList user={fakeUser} />);
    await screen.findByText("No parent accounts yet.");

    await userEvent.click(screen.getByRole("button", { name: "Log Out" }));

    expect(signOut).toHaveBeenCalledWith("fake-auth");
  });
});
