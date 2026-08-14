import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AnnouncementsFeed from "@/components/AnnouncementsFeed";

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

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AnnouncementsFeed", () => {
  it("shows a loading state initially", () => {
    getDocs.mockReturnValue(new Promise(() => {}));
    render(<AnnouncementsFeed />);

    expect(screen.getByText("Loading announcements…")).toBeInTheDocument();
  });

  it("renders announcements on success", async () => {
    getDocs.mockResolvedValue({
      docs: [
        { id: "a1", data: () => ({ title: "Closed Friday", body: "School closed for a holiday", createdBy: "staff@earlydays.example", createdAt: Date.now() }) },
      ],
    });

    render(<AnnouncementsFeed />);

    expect(await screen.findByText("Closed Friday")).toBeInTheDocument();
    expect(screen.getByText("School closed for a holiday")).toBeInTheDocument();
  });

  it("shows an empty state when there are no announcements", async () => {
    getDocs.mockResolvedValue({ docs: [] });

    render(<AnnouncementsFeed />);

    expect(await screen.findByText("No announcements yet.")).toBeInTheDocument();
  });

  it("shows an error state when the read fails", async () => {
    getDocs.mockRejectedValue(new Error("permission-denied"));

    render(<AnnouncementsFeed />);

    expect(await screen.findByText("Couldn’t load announcements. Please try again.")).toBeInTheDocument();
  });
});
