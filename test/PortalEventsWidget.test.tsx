import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PortalEventsWidget from "@/components/PortalEventsWidget";

const getDocs = vi.fn();

vi.mock("firebase/firestore", () => ({
  collection: () => ({}),
  query: () => ({}),
  orderBy: () => ({}),
  where: () => ({}),
  limit: () => ({}),
  getDocs: (...args: unknown[]) => getDocs(...args),
}));

vi.mock("@/lib/firebase/client", () => ({
  getFirebaseDb: () => ({}),
}));

const fakeEvent = {
  title: "Sports Day",
  date: "2099-01-15",
  tag: "Whole School",
  desc: "Annual sports day",
  createdBy: "staff@earlydays.example",
  createdAt: Date.now(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PortalEventsWidget", () => {
  it("shows a loading state initially", () => {
    getDocs.mockReturnValue(new Promise(() => {}));
    render(<PortalEventsWidget />);

    expect(screen.getByText("Loading upcoming events…")).toBeInTheDocument();
  });

  it("renders upcoming events on success", async () => {
    getDocs.mockResolvedValue({ docs: [{ id: "e1", data: () => fakeEvent }] });

    render(<PortalEventsWidget />);

    expect(await screen.findByText("Sports Day")).toBeInTheDocument();
    expect(screen.getByText("Whole School")).toBeInTheDocument();
  });

  it("shows an empty state when there are no upcoming events", async () => {
    getDocs.mockResolvedValue({ docs: [] });

    render(<PortalEventsWidget />);

    expect(await screen.findByText("No upcoming events yet.")).toBeInTheDocument();
  });

  it("shows an error state when the read fails", async () => {
    getDocs.mockRejectedValue(new Error("permission-denied"));

    render(<PortalEventsWidget />);

    expect(await screen.findByText("Couldn’t load upcoming events. Please try again.")).toBeInTheDocument();
  });
});
