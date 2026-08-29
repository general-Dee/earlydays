import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PortalDashboard from "@/components/PortalDashboard";

const getDoc = vi.fn();
const getDocs = vi.fn();
const signOut = vi.fn();

vi.mock("firebase/firestore", () => ({
  collection: () => ({}),
  doc: () => ({}),
  getDoc: (...args: unknown[]) => getDoc(...args),
  getDocs: (...args: unknown[]) => getDocs(...args),
  orderBy: () => ({}),
  query: () => ({}),
}));

vi.mock("firebase/auth", () => ({
  signOut: (...args: unknown[]) => signOut(...args),
}));

vi.mock("@/lib/firebase/client", () => ({
  getFirebaseAuth: () => ({}),
  getFirebaseDb: () => ({}),
}));

vi.mock("@/components/AnnouncementsFeed", () => ({
  default: () => <div data-testid="announcements-feed" />,
}));

vi.mock("@/components/PortalEventsWidget", () => ({
  default: () => <div data-testid="events-widget" />,
}));

vi.mock("@/components/PortalReportsWidget", () => ({
  default: ({ uid }: { uid: string }) => <div data-testid="reports-widget">{uid}</div>,
}));

vi.mock("@/components/PortalProfileForm", () => ({
  default: ({ parent, onSaved }: { parent: { guardianName: string }; onSaved: (patch: { guardianName: string }) => void }) => (
    <div>
      <span data-testid="profile-name">{parent.guardianName}</span>
      <button onClick={() => onSaved({ guardianName: "Updated Name" })}>trigger-save</button>
    </div>
  ),
}));

const fakeUser = { uid: "u1", email: "parent@example.com" } as any;

const fakeParent = {
  guardianName: "Aisha",
  email: "parent@example.com",
  children: [{ id: "c1", name: "Zainab", stage: "Nursery 1" }],
  createdAt: 1,
};

const fakePayment = {
  reference: "edy_1",
  childId: "c1",
  childName: "Zainab",
  term: "Term 3",
  amountKobo: 60_000_00,
  status: "success" as const,
  createdAt: 1,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PortalDashboard", () => {
  it("shows a loading state initially", () => {
    getDoc.mockReturnValue(new Promise(() => {}));
    render(<PortalDashboard user={fakeUser} />);

    expect(screen.getByText("Loading your records…")).toBeInTheDocument();
  });

  it("shows a not-found message when there's no parent doc for this account", async () => {
    getDoc.mockResolvedValue({ exists: () => false });

    render(<PortalDashboard user={fakeUser} />);

    expect(
      await screen.findByText(
        "We couldn’t find a parent record for this account yet. Contact the school office to have your children linked to your portal login."
      )
    ).toBeInTheDocument();
  });

  it("shows a not-found message when the read fails", async () => {
    getDoc.mockRejectedValue(new Error("permission-denied"));

    render(<PortalDashboard user={fakeUser} />);

    expect(await screen.findByText(/We couldn’t find a parent record/)).toBeInTheDocument();
  });

  it("renders children and payment history once loaded", async () => {
    getDoc.mockResolvedValue({ exists: () => true, data: () => fakeParent });
    getDocs.mockResolvedValue({ docs: [{ data: () => fakePayment }] });

    render(<PortalDashboard user={fakeUser} />);

    expect(await screen.findByText("Zainab")).toBeInTheDocument();
    expect(screen.getByText("Nursery 1")).toBeInTheDocument();
    expect(screen.getByText("Zainab — Term 3")).toBeInTheDocument();
    expect(screen.getByText("₦60,000")).toBeInTheDocument();
    expect(screen.getByText("success")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View receipt" })).toHaveAttribute("href", "/portal/receipts/edy_1");
  });

  it("shows an empty-children and empty-payments message when there are none", async () => {
    getDoc.mockResolvedValue({ exists: () => true, data: () => ({ ...fakeParent, children: [] }) });
    getDocs.mockResolvedValue({ docs: [] });

    render(<PortalDashboard user={fakeUser} />);

    expect(await screen.findByText("No children linked to this account yet.")).toBeInTheDocument();
    expect(screen.getByText("No payments yet.")).toBeInTheDocument();
  });

  it("doesn't show a receipt link for a pending payment", async () => {
    getDoc.mockResolvedValue({ exists: () => true, data: () => fakeParent });
    getDocs.mockResolvedValue({ docs: [{ data: () => ({ ...fakePayment, status: "pending" }) }] });

    render(<PortalDashboard user={fakeUser} />);

    expect(await screen.findByText("pending")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "View receipt" })).not.toBeInTheDocument();
  });

  it("passes the loaded parent into PortalProfileForm and applies its onSaved patch", async () => {
    getDoc.mockResolvedValue({ exists: () => true, data: () => fakeParent });
    getDocs.mockResolvedValue({ docs: [] });

    render(<PortalDashboard user={fakeUser} />);

    expect(await screen.findByTestId("profile-name")).toHaveTextContent("Aisha");

    await userEvent.click(screen.getByRole("button", { name: "trigger-save" }));

    expect(await screen.findByTestId("profile-name")).toHaveTextContent("Updated Name");
  });

  it("logs out when the Log Out button is clicked", async () => {
    getDoc.mockResolvedValue({ exists: () => true, data: () => fakeParent });
    getDocs.mockResolvedValue({ docs: [] });

    render(<PortalDashboard user={fakeUser} />);

    await userEvent.click(screen.getByRole("button", { name: "Log Out" }));

    expect(signOut).toHaveBeenCalled();
  });
});
