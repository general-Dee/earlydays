import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "firebase/auth";
import AdminPaymentsList from "@/components/AdminPaymentsList";

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

const samplePayment = {
  reference: "ref-1",
  parentUid: "p1",
  guardianName: "Aisha Okafor",
  guardianEmail: "aisha@example.com",
  childId: "c1",
  childName: "Femi Okafor",
  term: "Term 1",
  amountKobo: 5000000,
  status: "success",
  channel: "card",
  createdAt: new Date("2026-01-15T10:00:00.000Z").getTime(),
  paidAt: new Date("2026-01-15T10:05:00.000Z").getTime(),
};

beforeEach(() => {
  vi.clearAllMocks();
  (fakeUser.getIdToken as ReturnType<typeof vi.fn>).mockResolvedValue("tok");
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AdminPaymentsList", () => {
  it("shows a loading state while payments are being fetched", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));

    render(<AdminPaymentsList user={fakeUser} />);

    expect(screen.getByText("Loading payments…")).toBeInTheDocument();
  });

  it("fetches and renders payments", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ payments: [samplePayment] }) })
    );

    render(<AdminPaymentsList user={fakeUser} />);

    expect(await screen.findByText(/Aisha Okafor · Femi Okafor/)).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      "/api/admin/payments",
      expect.objectContaining({ headers: { Authorization: "Bearer tok" } })
    );
  });

  it("shows a not-authorized message on a 403", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 403, json: async () => ({ error: "Not authorized" }) })
    );

    render(<AdminPaymentsList user={fakeUser} />);

    expect(
      await screen.findByText("You’re logged in, but this account isn’t authorized to view payments.")
    ).toBeInTheDocument();
  });

  it("shows an error message when the fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) }));

    render(<AdminPaymentsList user={fakeUser} />);

    expect(await screen.findByText("Couldn’t load payments. Please try again.")).toBeInTheDocument();
  });

  it("shows an empty state when there are no payments", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ payments: [] }) }));

    render(<AdminPaymentsList user={fakeUser} />);

    expect(await screen.findByText("No payments yet.")).toBeInTheDocument();
  });

  it("narrows the list by search text", async () => {
    const other = { ...samplePayment, reference: "ref-2", guardianName: "Bola Adeyemi", childName: "Chidi Adeyemi" };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ payments: [samplePayment, other] }) })
    );

    render(<AdminPaymentsList user={fakeUser} />);
    await screen.findByText(/Aisha Okafor/);
    expect(screen.getByText(/Bola Adeyemi/)).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("Search payments"), "Bola");

    expect(screen.getByText(/Bola Adeyemi/)).toBeInTheDocument();
    expect(screen.queryByText(/Aisha Okafor/)).not.toBeInTheDocument();
  });

  it("narrows the list by the status filter", async () => {
    const pending = { ...samplePayment, reference: "ref-2", guardianName: "Bola Adeyemi", status: "pending" };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ payments: [samplePayment, pending] }) })
    );

    render(<AdminPaymentsList user={fakeUser} />);
    await screen.findByText(/Aisha Okafor/);

    await userEvent.selectOptions(screen.getByLabelText("Filter by status"), "pending");

    expect(screen.getByText(/Bola Adeyemi/)).toBeInTheDocument();
    expect(screen.queryByText(/Aisha Okafor · Femi Okafor/)).not.toBeInTheDocument();
  });

  it("narrows the list by the term filter", async () => {
    const term2 = { ...samplePayment, reference: "ref-2", guardianName: "Bola Adeyemi", term: "Term 2" };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ payments: [samplePayment, term2] }) })
    );

    render(<AdminPaymentsList user={fakeUser} />);
    await screen.findByText(/Aisha Okafor/);

    await userEvent.selectOptions(screen.getByLabelText("Filter by term"), "Term 2");

    expect(screen.getByText(/Bola Adeyemi/)).toBeInTheDocument();
    expect(screen.queryByText(/Aisha Okafor · Femi Okafor/)).not.toBeInTheDocument();
  });

  it("shows a View Receipt link only for successful payments", async () => {
    const pending = { ...samplePayment, reference: "ref-2", guardianName: "Bola Adeyemi", status: "pending" };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ payments: [samplePayment, pending] }) })
    );

    render(<AdminPaymentsList user={fakeUser} />);
    await screen.findByText(/Aisha Okafor/);

    const links = screen.getAllByRole("link", { name: "View Receipt" });
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute("href", "/admin/payments/ref-1?uid=p1");
  });

  it("shows a Re-verify button only for pending payments", async () => {
    const pending = { ...samplePayment, reference: "ref-2", guardianName: "Bola Adeyemi", status: "pending" };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ payments: [samplePayment, pending] }) })
    );

    render(<AdminPaymentsList user={fakeUser} />);
    await screen.findByText(/Aisha Okafor/);

    const buttons = screen.getAllByRole("button", { name: "Re-verify" });
    expect(buttons).toHaveLength(1);
  });

  it("re-verifies a pending payment and updates its status on success", async () => {
    const pending = { ...samplePayment, reference: "ref-2", guardianName: "Bola Adeyemi", status: "pending" };
    const fetchMock = vi.fn((url: string) => {
      if (url === "/api/admin/payments/ref-2") {
        return Promise.resolve({ ok: true, json: async () => ({ status: "success", emailSent: true }) });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ payments: [samplePayment, pending] }) });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminPaymentsList user={fakeUser} />);
    await screen.findByText(/Bola Adeyemi/);

    await userEvent.click(screen.getByRole("button", { name: "Re-verify" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/payments/ref-2",
      expect.objectContaining({
        method: "POST",
        headers: { Authorization: "Bearer tok", "Content-Type": "application/json" },
        body: JSON.stringify({ uid: "p1" }),
      })
    );
    expect(await screen.findAllByText("success")).not.toHaveLength(0);
    expect(screen.queryByRole("button", { name: "Re-verify" })).not.toBeInTheDocument();
    expect(screen.queryByText(/receipt email failed to send/i)).not.toBeInTheDocument();
  });

  it("warns when the receipt email fails to send", async () => {
    const pending = { ...samplePayment, reference: "ref-2", guardianName: "Bola Adeyemi", status: "pending" };
    const fetchMock = vi.fn((url: string) => {
      if (url === "/api/admin/payments/ref-2") {
        return Promise.resolve({ ok: true, json: async () => ({ status: "success", emailSent: false }) });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ payments: [pending] }) });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminPaymentsList user={fakeUser} />);
    await screen.findByText(/Bola Adeyemi/);

    await userEvent.click(screen.getByRole("button", { name: "Re-verify" }));

    expect(await screen.findByText(/receipt email failed to send/i)).toBeInTheDocument();
  });

  it("doesn't warn about the receipt email when reconciliation fails outright", async () => {
    const pending = { ...samplePayment, reference: "ref-2", guardianName: "Bola Adeyemi", status: "pending" };
    const fetchMock = vi.fn((url: string) => {
      if (url === "/api/admin/payments/ref-2") {
        return Promise.resolve({ ok: true, json: async () => ({ status: "failed", emailSent: false }) });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ payments: [pending] }) });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminPaymentsList user={fakeUser} />);
    await screen.findByText(/Bola Adeyemi/);

    await userEvent.click(screen.getByRole("button", { name: "Re-verify" }));

    expect(await screen.findAllByText("failed")).not.toHaveLength(0);
    expect(screen.queryByText(/receipt email failed to send/i)).not.toBeInTheDocument();
  });

  it("shows an inline error when re-verification fails", async () => {
    const pending = { ...samplePayment, reference: "ref-2", guardianName: "Bola Adeyemi", status: "pending" };
    const fetchMock = vi.fn((url: string) => {
      if (url === "/api/admin/payments/ref-2") {
        return Promise.resolve({ ok: false, json: async () => ({ error: "Only pending payments can be reconciled" }) });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ payments: [pending] }) });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminPaymentsList user={fakeUser} />);
    await screen.findByText(/Bola Adeyemi/);

    await userEvent.click(screen.getByRole("button", { name: "Re-verify" }));

    expect(await screen.findByText("Only pending payments can be reconciled")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Re-verify" })).toBeInTheDocument();
  });

  it("exports only the status-filtered payments as a CSV download", async () => {
    const pending = { ...samplePayment, reference: "ref-2", guardianName: "Bola Adeyemi", status: "pending" };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ payments: [samplePayment, pending] }) })
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

    render(<AdminPaymentsList user={fakeUser} />);
    await screen.findByText(/Aisha Okafor/);

    await userEvent.selectOptions(screen.getByLabelText("Filter by status"), "pending");

    const link = document.createElement("a");
    const clickSpy = vi.spyOn(link, "click").mockImplementation(() => {});
    const createElementSpy = vi.spyOn(document, "createElement").mockReturnValue(link);

    await userEvent.click(screen.getByRole("button", { name: "Export CSV" }));

    expect(clickSpy).toHaveBeenCalled();
    expect(link.download).toMatch(/^payments-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(capturedContent).toContain("Bola Adeyemi");
    expect(capturedContent).not.toContain("ref-1");

    createElementSpy.mockRestore();
  });

  it("paginates when there are more records than fit on one page", async () => {
    const many = Array.from({ length: 21 }, (_, i) => ({
      ...samplePayment,
      reference: `ref-${i}`,
      guardianName: `Guardian ${i}`,
    }));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ payments: many }) }));

    render(<AdminPaymentsList user={fakeUser} />);
    await screen.findByText(/Guardian 0 ·/);

    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
    expect(screen.queryByText(/Guardian 20 ·/)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Next ›" }));

    expect(await screen.findByText(/Guardian 20 ·/)).toBeInTheDocument();
    expect(screen.queryByText(/Guardian 0 ·/)).not.toBeInTheDocument();
  });

  it("doesn't show pagination controls when everything fits on one page", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ payments: [samplePayment] }) })
    );

    render(<AdminPaymentsList user={fakeUser} />);
    await screen.findByText(/Aisha Okafor/);

    expect(screen.queryByText(/Page \d+ of \d+/)).not.toBeInTheDocument();
  });

  it("signs out via the Log Out button", async () => {
    const { signOut } = await import("firebase/auth");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ payments: [] }) }));

    render(<AdminPaymentsList user={fakeUser} />);
    await screen.findByText("No payments yet.");

    await userEvent.click(screen.getByRole("button", { name: "Log Out" }));

    expect(signOut).toHaveBeenCalledWith("fake-auth");
  });
});
