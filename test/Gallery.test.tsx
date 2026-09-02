import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Gallery from "@/components/Gallery";

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

const photoA = {
  id: "g1",
  alt: "Sunflower-painted welcome entrance",
  category: "Campus & Grounds",
  photoUrl: "https://firebasestorage.googleapis.com/v0/b/test/o/gallery%2Fg1%2Fg1.jpg?alt=media",
  order: 0,
  createdBy: "staff@earlydays.example",
  createdAt: 1,
};

const photoB = {
  id: "g2",
  alt: "Yellow and green Nursery classroom",
  category: "Classrooms",
  photoUrl: "https://firebasestorage.googleapis.com/v0/b/test/o/gallery%2Fg2%2Fg2.jpg?alt=media",
  order: 1,
  createdBy: "staff@earlydays.example",
  createdAt: 2,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Gallery", () => {
  it("shows a loading state initially", () => {
    getDocs.mockReturnValue(new Promise(() => {}));
    render(<Gallery />);

    expect(screen.getByText("Loading the gallery…")).toBeInTheDocument();
  });

  it("renders every photo and filters by category", async () => {
    getDocs.mockResolvedValue({ docs: [{ data: () => photoA }, { data: () => photoB }] });

    render(<Gallery />);

    expect(await screen.findByLabelText(`View larger image: ${photoA.alt}`)).toBeInTheDocument();
    expect(screen.getByLabelText(`View larger image: ${photoB.alt}`)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Classrooms" }));

    expect(screen.queryByLabelText(`View larger image: ${photoA.alt}`)).not.toBeInTheDocument();
    expect(screen.getByLabelText(`View larger image: ${photoB.alt}`)).toBeInTheDocument();
  });

  it("shows an empty state when there are no photos yet", async () => {
    getDocs.mockResolvedValue({ docs: [] });

    render(<Gallery />);

    expect(await screen.findByText("Gallery photos are coming soon.")).toBeInTheDocument();
  });

  it("shows an error state when the read fails", async () => {
    getDocs.mockRejectedValue(new Error("permission-denied"));

    render(<Gallery />);

    expect(await screen.findByText("Couldn’t load the gallery. Please try again.")).toBeInTheDocument();
  });
});
