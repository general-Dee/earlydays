import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PortalReportsWidget from "@/components/PortalReportsWidget";

const getDocs = vi.fn();
const getDownloadURL = vi.fn();

vi.mock("firebase/firestore", () => ({
  collection: () => ({}),
  query: () => ({}),
  orderBy: () => ({}),
  getDocs: (...args: unknown[]) => getDocs(...args),
}));

vi.mock("firebase/storage", () => ({
  ref: () => ({}),
  getDownloadURL: (...args: unknown[]) => getDownloadURL(...args),
}));

vi.mock("@/lib/firebase/client", () => ({
  getFirebaseDb: () => ({}),
  getFirebaseStorage: () => ({}),
}));

const fakeReport = {
  id: "r1",
  childId: "c1",
  childName: "Zainab",
  term: "Term 3",
  fileName: "report.pdf",
  storagePath: "reports/u1/r1.pdf",
  uploadedBy: "staff@earlydays.example",
  createdAt: Date.now(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("PortalReportsWidget", () => {
  it("shows a loading state initially", () => {
    getDocs.mockReturnValue(new Promise(() => {}));
    render(<PortalReportsWidget uid="u1" />);

    expect(screen.getByText("Loading reports…")).toBeInTheDocument();
  });

  it("shows an empty state when there are no reports", async () => {
    getDocs.mockResolvedValue({ docs: [] });
    render(<PortalReportsWidget uid="u1" />);

    expect(await screen.findByText("No progress reports yet.")).toBeInTheDocument();
  });

  it("shows an error state when the read fails", async () => {
    getDocs.mockRejectedValue(new Error("permission-denied"));
    render(<PortalReportsWidget uid="u1" />);

    expect(await screen.findByText("Couldn’t load progress reports. Please try again.")).toBeInTheDocument();
  });

  it("renders reports and opens a download URL on click", async () => {
    getDocs.mockResolvedValue({ docs: [{ data: () => fakeReport }] });
    getDownloadURL.mockResolvedValue("https://storage.example/reports/u1/r1.pdf");
    vi.stubGlobal("open", vi.fn());

    render(<PortalReportsWidget uid="u1" />);

    expect(await screen.findByText("Zainab — Term 3")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Download" }));

    expect(getDownloadURL).toHaveBeenCalled();
    expect(window.open).toHaveBeenCalledWith(
      "https://storage.example/reports/u1/r1.pdf",
      "_blank",
      "noopener,noreferrer"
    );
  });
});
