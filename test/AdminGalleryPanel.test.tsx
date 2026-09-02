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
