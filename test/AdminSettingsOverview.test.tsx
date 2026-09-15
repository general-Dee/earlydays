import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminSettingsOverview from "@/components/AdminSettingsOverview";

vi.mock("firebase/auth", () => ({
  signOut: vi.fn(),
}));

vi.mock("@/lib/firebase/client", () => ({
  getFirebaseAuth: () => ({}),
}));

const fakeUser = { email: "boss@earlydays.example", getIdToken: vi.fn().mockResolvedValue("tok") } as any;

const fakeSettings = {
  whatsapp: "2348012345678",
  phone: "+234 801 234 5678",
  email: "hello@earlydays.example",
  notifyEmail: "office@earlydays.example",
};

beforeEach(() => {
  vi.clearAllMocks();
  fakeUser.getIdToken.mockResolvedValue("tok");
});

describe("AdminSettingsOverview", () => {
  it("shows a loading state initially", () => {
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise(() => {})));
    render(<AdminSettingsOverview user={fakeUser} />);

    expect(screen.getByText("Loading settings…")).toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it("shows a forbidden message for a 403 response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 403, json: async () => ({}) }));
    render(<AdminSettingsOverview user={fakeUser} />);

    expect(await screen.findByText(/isn.t authorized to view settings/)).toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it("loads and displays the current settings", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => fakeSettings }));
    render(<AdminSettingsOverview user={fakeUser} />);

    expect(await screen.findByDisplayValue("2348012345678")).toBeInTheDocument();
    expect(screen.getByDisplayValue("office@earlydays.example")).toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it("shows a Last updated line when settings have updatedBy/updatedAt", async () => {
    const withMeta = { ...fakeSettings, updatedBy: "boss@earlydays.example", updatedAt: Date.now() };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => withMeta }));
    render(<AdminSettingsOverview user={fakeUser} />);

    expect(await screen.findByText(/Last updated by boss@earlydays.example/)).toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it("doesn't show a Last updated line when settings have never been saved", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => fakeSettings }));
    render(<AdminSettingsOverview user={fakeUser} />);

    await screen.findByDisplayValue("2348012345678");
    expect(screen.queryByText(/Last updated by/)).not.toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it("saves updated settings", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "PATCH") {
        const body = JSON.parse(init.body as string);
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ ...fakeSettings, ...body }) });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => fakeSettings });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminSettingsOverview user={fakeUser} />);
    await screen.findByDisplayValue("2348012345678");

    const whatsappInput = screen.getByLabelText(/WhatsApp number/);
    await userEvent.clear(whatsappInput);
    await userEvent.type(whatsappInput, "2349087654321");
    await userEvent.click(screen.getByRole("button", { name: "Save Settings" }));

    expect(await screen.findByText("Saved.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/settings",
      expect.objectContaining({ method: "PATCH", headers: { Authorization: "Bearer tok", "Content-Type": "application/json" } })
    );
    vi.unstubAllGlobals();
  });

  it("shows an error message when saving fails", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "PATCH") {
        return Promise.resolve({ ok: false, status: 400, json: async () => ({ error: "Enter a valid contact email" }) });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => fakeSettings });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminSettingsOverview user={fakeUser} />);
    await screen.findByDisplayValue("2348012345678");
    await userEvent.click(screen.getByRole("button", { name: "Save Settings" }));

    expect(await screen.findByText("Enter a valid contact email")).toBeInTheDocument();
    vi.unstubAllGlobals();
  });
});
