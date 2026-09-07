import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

const fakeParent = {
  uid: "u1",
  guardianName: "Aisha Bello",
  email: "a@b.com",
  phone: "+2348000000000",
  children: [],
  createdAt: 1,
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
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

  it("doesn't show an RSVP control when no parent record is available", async () => {
    getDocs.mockResolvedValue({ docs: [{ id: "e1", data: () => fakeEvent }] });

    render(<PortalEventsWidget />);

    await screen.findByText("Sports Day");
    expect(screen.queryByRole("button", { name: "RSVP" })).not.toBeInTheDocument();
  });

  it("shows an RSVP button when a parent record is available", async () => {
    getDocs.mockResolvedValue({ docs: [{ id: "e1", data: () => fakeEvent }] });

    render(<PortalEventsWidget parent={fakeParent} />);

    expect(await screen.findByRole("button", { name: "RSVP" })).toBeInTheDocument();
  });

  it("submits the RSVP using the parent's profile info and shows a success message", async () => {
    getDocs.mockResolvedValue({ docs: [{ id: "e1", data: () => fakeEvent }] });
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true }) });
    vi.stubGlobal("fetch", fetchMock);

    render(<PortalEventsWidget parent={fakeParent} />);
    await userEvent.click(await screen.findByRole("button", { name: "RSVP" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirm RSVP" }));

    expect(await screen.findByText("You’re RSVP’d for 1 guest.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/events/e1/rsvp",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: "Aisha Bello", email: "a@b.com", phone: "+2348000000000", guestCount: 1 }),
      })
    );
  });

  it("shows an error message when the RSVP submission fails", async () => {
    getDocs.mockResolvedValue({ docs: [{ id: "e1", data: () => fakeEvent }] });
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: false, status: 500, json: async () => ({ error: "Something went wrong" }) });
    vi.stubGlobal("fetch", fetchMock);

    render(<PortalEventsWidget parent={fakeParent} />);
    await userEvent.click(await screen.findByRole("button", { name: "RSVP" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirm RSVP" }));

    expect(await screen.findByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm RSVP" })).toBeInTheDocument();
  });
});
