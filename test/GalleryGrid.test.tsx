import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import GalleryGrid from "@/components/GalleryGrid";

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

const getDocs = vi.fn();

vi.mock("firebase/firestore", () => ({
  collection: () => ({}),
  query: () => ({}),
  orderBy: () => ({}),
  getDocs: (...args: unknown[]) => getDocs(...args),
}));

vi.mock("@/lib/firebase/client", () => ({
  getFirebaseDb: () => ({}),
}));

vi.mock("next/image", () => ({
  default: (props: { src: string; alt: string }) => <img src={props.src} alt={props.alt} />,
}));

function fakePhoto(id: string, order: number, tall = false) {
  return {
    id,
    alt: `Photo ${id}`,
    category: "Campus & Grounds",
    photoUrl: `https://firebasestorage.googleapis.com/v0/b/test/o/gallery%2F${id}%2F${id}.jpg?alt=media`,
    order,
    createdBy: "staff@earlydays.example",
    createdAt: 1,
    ...(tall ? { tall: true } : {}),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GalleryGrid", () => {
  it("renders nothing while loading", () => {
    getDocs.mockReturnValue(new Promise(() => {}));
    const { container } = render(<GalleryGrid />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when there are no photos", async () => {
    getDocs.mockResolvedValue({ docs: [] });
    const { container } = render(<GalleryGrid />);

    await flush();
    expect(container).toBeEmptyDOMElement();
  });

  it("renders at most the first 6 photos by order", async () => {
    const photos = Array.from({ length: 8 }, (_, i) => fakePhoto(`g${i}`, i, i === 0));
    getDocs.mockResolvedValue({ docs: photos.map((p) => ({ data: () => p })) });

    render(<GalleryGrid />);

    expect(await screen.findByAltText("Photo g0")).toBeInTheDocument();
    expect(screen.getByAltText("Photo g5")).toBeInTheDocument();
    expect(screen.queryByAltText("Photo g6")).not.toBeInTheDocument();
    expect(screen.queryByAltText("Photo g7")).not.toBeInTheDocument();
  });

  it("renders nothing when the read fails", async () => {
    getDocs.mockRejectedValue(new Error("permission-denied"));
    const { container } = render(<GalleryGrid />);

    await flush();
    expect(container).toBeEmptyDOMElement();
  });
});
