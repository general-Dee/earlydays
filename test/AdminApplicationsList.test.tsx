import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "firebase/auth";
import AdminApplicationsList from "@/components/AdminApplicationsList";

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
  referenceCode: "REF-1",
  createdAt: Date.now(),
};

beforeEach(() => {
  vi.clearAllMocks();
  (fakeUser.getIdToken as ReturnType<typeof vi.fn>).mockResolvedValue("tok");
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AdminApplicationsList", () => {
  it("shows a loading state while applications are being fetched", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));

    render(<AdminApplicationsList user={fakeUser} />);

    expect(screen.getByText("Loading applications…")).toBeInTheDocument();
  });

  it("fetches and renders applications", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ applications: [sampleApplication] }),
      })
    );

    render(<AdminApplicationsList user={fakeUser} />);

    expect(await screen.findByText(/Femi Okafor/)).toBeInTheDocument();
    expect(screen.getByText("Loves music.")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      "/api/admin/applications",
      expect.objectContaining({ headers: { Authorization: "Bearer tok" } })
    );
  });

  it("shows a not-authorized message on a 403", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 403, json: async () => ({ error: "Not authorized" }) })
    );

    render(<AdminApplicationsList user={fakeUser} />);

    expect(
      await screen.findByText("You’re logged in, but this account isn’t authorized to view applications.")
    ).toBeInTheDocument();
  });

  it("shows an error message when the fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) }));

    render(<AdminApplicationsList user={fakeUser} />);

    expect(await screen.findByText("Couldn’t load applications. Please try again.")).toBeInTheDocument();
  });

  it("shows an empty state when there are no applications", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ applications: [] }) })
    );

    render(<AdminApplicationsList user={fakeUser} />);

    expect(await screen.findByText("No applications yet.")).toBeInTheDocument();
  });

  it("narrows the list by search text", async () => {
    const other = { ...sampleApplication, id: "a2", childName: "Bola Adeyemi", guardianName: "Chidi Adeyemi" };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ applications: [sampleApplication, other] }),
      })
    );

    render(<AdminApplicationsList user={fakeUser} />);
    await screen.findByText(/Femi Okafor/);
    expect(screen.getByText(/Bola Adeyemi/)).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("Search applications"), "Bola");

    expect(screen.getByText(/Bola Adeyemi/)).toBeInTheDocument();
    expect(screen.queryByText(/Femi Okafor/)).not.toBeInTheDocument();
  });

  it("narrows the list by the status filter", async () => {
    const accepted = { ...sampleApplication, id: "a2", childName: "Bola Adeyemi", status: "accepted" };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ applications: [sampleApplication, accepted] }),
      })
    );

    render(<AdminApplicationsList user={fakeUser} />);
    await screen.findByText(/Femi Okafor/);

    await userEvent.selectOptions(screen.getByLabelText("Filter by status"), "accepted");

    expect(screen.getByText(/Bola Adeyemi/)).toBeInTheDocument();
    expect(screen.queryByText(/Femi Okafor/)).not.toBeInTheDocument();
  });

  it("exports only the status-filtered applications as a CSV download", async () => {
    const accepted = { ...sampleApplication, id: "a2", childName: "Bola Adeyemi", status: "accepted" };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ applications: [sampleApplication, accepted] }),
      })
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

    render(<AdminApplicationsList user={fakeUser} />);
    await screen.findByText(/Femi Okafor/);

    await userEvent.selectOptions(screen.getByLabelText("Filter by status"), "accepted");

    const link = document.createElement("a");
    const clickSpy = vi.spyOn(link, "click").mockImplementation(() => {});
    const createElementSpy = vi.spyOn(document, "createElement").mockReturnValue(link);

    await userEvent.click(screen.getByRole("button", { name: "Export CSV" }));

    expect(clickSpy).toHaveBeenCalled();
    expect(link.download).toMatch(/^applications-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(capturedContent).toContain("Bola Adeyemi");
    expect(capturedContent).not.toContain("Femi Okafor");

    createElementSpy.mockRestore();
  });

  it("paginates when there are more records than fit on one page", async () => {
    const many = Array.from({ length: 21 }, (_, i) => ({
      ...sampleApplication,
      id: `a${i}`,
      childName: `Child ${i}`,
    }));
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ applications: many }) })
    );

    render(<AdminApplicationsList user={fakeUser} />);
    await screen.findByText(/Child 0 ·/);

    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
    expect(screen.queryByText(/Child 20 ·/)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Next ›" }));

    expect(await screen.findByText(/Child 20 ·/)).toBeInTheDocument();
    expect(screen.queryByText(/Child 0 ·/)).not.toBeInTheDocument();
  });

  it("doesn't show pagination controls when everything fits on one page", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ applications: [sampleApplication] }),
      })
    );

    render(<AdminApplicationsList user={fakeUser} />);
    await screen.findByText(/Femi Okafor/);

    expect(screen.queryByText(/Page \d+ of \d+/)).not.toBeInTheDocument();
  });

  it("adds an application submitted through the create form", async () => {
    const created = { ...sampleApplication, id: "a9", childName: "New Kid", guardianName: "New Guardian" };
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        return Promise.resolve({ ok: true, status: 200, json: async () => created });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ applications: [sampleApplication] }) });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminApplicationsList user={fakeUser} />);
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

    render(<AdminApplicationsList user={fakeUser} />);
    await screen.findByText(/Femi Okafor/);

    await userEvent.type(screen.getByPlaceholderText("Child's full name"), "New Kid");
    await userEvent.type(screen.getByLabelText("Child's date of birth"), "2022-01-01");
    await userEvent.type(screen.getByPlaceholderText("Guardian full name"), "New Guardian");
    await userEvent.click(screen.getByRole("button", { name: "Add Application" }));

    expect(await screen.findByText("Provide an email or phone number")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Child's full name")).toHaveValue("New Kid");
  });

  it("updates an application's status via the status control", async () => {
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

    render(<AdminApplicationsList user={fakeUser} />);

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

  it("reverts an application's status if the status update fails", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "PATCH") {
        return Promise.resolve({ ok: false, status: 500, json: async () => ({ error: "fail" }) });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ applications: [sampleApplication] }),
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminApplicationsList user={fakeUser} />);

    await screen.findByText(/Femi Okafor/);
    const select = screen.getByRole("combobox", { name: "Status for Femi Okafor" });
    await userEvent.selectOptions(select, "accepted");

    expect(await screen.findByDisplayValue("new")).toBeInTheDocument();
  });

  it("deletes an application via the delete button", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "DELETE") {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ ok: true }) });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ applications: [sampleApplication] }) });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminApplicationsList user={fakeUser} />);
    await screen.findByText(/Femi Okafor/);

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/applications/a1",
      expect.objectContaining({ method: "DELETE", headers: { Authorization: "Bearer tok" } })
    );
    expect(screen.queryByText(/Femi Okafor/)).not.toBeInTheDocument();
  });

  it("restores the application if delete fails", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "DELETE") {
        return Promise.resolve({ ok: false, status: 500, json: async () => ({ error: "fail" }) });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ applications: [sampleApplication] }) });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminApplicationsList user={fakeUser} />);
    await screen.findByText(/Femi Okafor/);

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(await screen.findByText(/Femi Okafor/)).toBeInTheDocument();
  });

  it("signs out via the Log Out button", async () => {
    const { signOut } = await import("firebase/auth");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ applications: [] }) })
    );

    render(<AdminApplicationsList user={fakeUser} />);
    await screen.findByText("No applications yet.");

    await userEvent.click(screen.getByRole("button", { name: "Log Out" }));

    expect(signOut).toHaveBeenCalledWith("fake-auth");
  });
});
