import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TeacherGrid from "@/components/TeacherGrid";

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

const fakeStaffWithPhoto = {
  id: "s1",
  name: "Mrs. Grace A.",
  role: "Head of Nursery",
  bio: "Eight years of nursery experience.",
  photoUrl: "https://firebasestorage.googleapis.com/v0/b/test/o/staff%2Fs1%2Fs1.jpg?alt=media",
  order: 0,
  createdBy: "staff@earlydays.example",
  createdAt: 1,
};

const fakeStaffNoPhoto = {
  id: "s2",
  name: "Mr. Yusuf I.",
  role: "Primary 4 Class Teacher",
  bio: "Six years teaching Primary 4.",
  order: 1,
  createdBy: "staff@earlydays.example",
  createdAt: 2,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("TeacherGrid", () => {
  it("shows a loading state initially", () => {
    getDocs.mockReturnValue(new Promise(() => {}));
    render(<TeacherGrid />);

    expect(screen.getByText("Loading our team…")).toBeInTheDocument();
  });

  it("renders staff in order, with a photo when present and initials when not", async () => {
    getDocs.mockResolvedValue({ docs: [{ data: () => fakeStaffWithPhoto }, { data: () => fakeStaffNoPhoto }] });

    render(<TeacherGrid />);

    expect(await screen.findByText("Mrs. Grace A.")).toBeInTheDocument();
    expect(screen.getByText("Eight years of nursery experience.")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Mrs. Grace A." })).toHaveAttribute("src", fakeStaffWithPhoto.photoUrl);

    expect(screen.getByText("Mr. Yusuf I.")).toBeInTheDocument();
    expect(screen.getByText("MY")).toBeInTheDocument();
  });

  it("shows an empty state when there's no staff yet", async () => {
    getDocs.mockResolvedValue({ docs: [] });

    render(<TeacherGrid />);

    expect(await screen.findByText("Team profiles are coming soon.")).toBeInTheDocument();
  });

  it("shows an error state when the read fails", async () => {
    getDocs.mockRejectedValue(new Error("permission-denied"));

    render(<TeacherGrid />);

    expect(await screen.findByText("Couldn’t load our team. Please try again.")).toBeInTheDocument();
  });
});
