import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminGalleryPanel from "@/components/AdminGalleryPanel";

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

const fakePhoto = {
  id: "g1",
  alt: "Sunflower-painted welcome entrance and gate at the Earlydays campus",
  category: "Campus & Grounds",
  tall: true,
  photoUrl: "https://firebasestorage.googleapis.com/v0/b/test/o/gallery%2Fg1%2Fg1.jpg?alt=media",
  photoStoragePath: "gallery/g1/g1.jpg",
  order: 0,
  createdBy: "staff@earlydays.example",
  createdAt: Date.now(),
};

function fakeFile(name = "photo.jpg", type = "image/jpeg") {
  return new File(["content"], name, { type });
}

beforeEach(() => {
  vi.clearAllMocks();
  fakeUser.getIdToken.mockResolvedValue("tok");
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AdminGalleryPanel", () => {
  it("shows the login form when logged out", () => {
    useAuth.mockReturnValue({ user: null, loading: false });
    render(<AdminGalleryPanel />);

    expect(screen.getByRole("button", { name: "Log In" })).toBeInTheDocument();
  });

  it("shows a loading state while auth is resolving", () => {
    useAuth.mockReturnValue({ user: null, loading: true });
    render(<AdminGalleryPanel />);

    expect(screen.getByText("Checking login status…")).toBeInTheDocument();
  });

  it("fetches and renders photos for a logged-in user", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ photos: [fakePhoto] }),
      })
    );

    render(<AdminGalleryPanel />);

    expect(await screen.findByText(fakePhoto.alt)).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      "/api/admin/gallery",
      expect.objectContaining({ headers: { Authorization: "Bearer tok" } })
    );
  });

  it("creates a photo and appends it to the list", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        return Promise.resolve({ ok: true, status: 200, json: async () => fakePhoto });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ photos: [] }) });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminGalleryPanel />);
    await screen.findByText("No gallery photos yet.");

    await userEvent.type(screen.getByPlaceholderText("Alt text (describe the photo)"), fakePhoto.alt);
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(fileInput, fakeFile());
    await userEvent.click(screen.getByRole("button", { name: "Add Photo" }));

    expect(await screen.findByText(fakePhoto.alt)).toBeInTheDocument();
    const postCall = fetchMock.mock.calls.find(([, init]) => init?.method === "POST");
    expect(postCall?.[0]).toBe("/api/admin/gallery");
    const body = postCall?.[1]?.body as FormData;
    expect(body.get("alt")).toBe(fakePhoto.alt);
    expect(body.get("category")).toBe("Campus & Grounds");
    expect(body.get("photo")).toBeInstanceOf(File);
  });

  it("deletes a photo via the delete button", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "DELETE") {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ ok: true }) });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ photos: [fakePhoto] }) });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminGalleryPanel />);
    await screen.findByText(fakePhoto.alt);
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/gallery/g1",
      expect.objectContaining({ method: "DELETE", headers: { Authorization: "Bearer tok" } })
    );
    expect(screen.queryByText(fakePhoto.alt)).not.toBeInTheDocument();
  });

  it("filters the list by search query", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    const otherPhoto = { ...fakePhoto, id: "g2", alt: "Children playing with building blocks", category: "Play & Discovery" };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ photos: [fakePhoto, otherPhoto] }) })
    );

    render(<AdminGalleryPanel />);
    await screen.findByText(fakePhoto.alt);
    expect(screen.getByText(otherPhoto.alt)).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("Search gallery photos"), "building blocks");

    expect(screen.getByText(otherPhoto.alt)).toBeInTheDocument();
    expect(screen.queryByText(fakePhoto.alt)).not.toBeInTheDocument();
  });

  it("exports the loaded photos as a CSV download", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ photos: [fakePhoto] }) })
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

    render(<AdminGalleryPanel />);
    await screen.findByText(fakePhoto.alt);

    const link = document.createElement("a");
    const clickSpy = vi.spyOn(link, "click").mockImplementation(() => {});
    const createElementSpy = vi.spyOn(document, "createElement").mockReturnValue(link);

    await userEvent.click(screen.getByRole("button", { name: "Export CSV" }));

    expect(clickSpy).toHaveBeenCalled();
    expect(link.download).toMatch(/^gallery-photos-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(capturedContent).toContain("Alt Text,Category,Tall,Photo URL,Order,Created By,Created At");
    expect(capturedContent).toContain(`${fakePhoto.alt},Campus & Grounds,Yes`);

    createElementSpy.mockRestore();
  });

  it("shows a not-authorized message on a 403", async () => {
    useAuth.mockReturnValue({ user: fakeUser, loading: false });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 403, json: async () => ({ error: "Not authorized" }) })
    );

    render(<AdminGalleryPanel />);

    expect(
      await screen.findByText("You’re logged in, but this account isn’t authorized to manage gallery photos.")
    ).toBeInTheDocument();
  });
});
