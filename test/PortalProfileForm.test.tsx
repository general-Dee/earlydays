import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PortalProfileForm from "@/components/PortalProfileForm";

const updateDoc = vi.fn();

vi.mock("firebase/firestore", () => ({
  doc: () => ({}),
  updateDoc: (...args: unknown[]) => updateDoc(...args),
}));

vi.mock("@/lib/firebase/client", () => ({
  getFirebaseDb: () => ({}),
}));

const fakeParent = { guardianName: "Aisha", phone: "+2348000000000" };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PortalProfileForm", () => {
  it("shows the current guardian details read-only by default", () => {
    render(<PortalProfileForm uid="u1" parent={fakeParent} onSaved={vi.fn()} />);

    expect(screen.getByText("Aisha")).toBeInTheDocument();
    expect(screen.getByText("+2348000000000")).toBeInTheDocument();
    expect(screen.queryByLabelText("Name")).not.toBeInTheDocument();
  });

  it("switches to an editable form and saves changes", async () => {
    updateDoc.mockResolvedValue(undefined);
    const onSaved = vi.fn();

    render(<PortalProfileForm uid="u1" parent={fakeParent} onSaved={onSaved} />);

    await userEvent.click(screen.getByRole("button", { name: "Edit" }));

    const nameInput = screen.getByLabelText("Name");
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Aisha B.");

    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    // Reverts to the read-only view — the new name only appears once the parent
    // (PortalDashboard) re-renders this component with an updated `parent` prop,
    // which is covered by PortalDashboard.test.tsx's onSaved-wiring test.
    expect(await screen.findByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(updateDoc).toHaveBeenCalledWith({}, { guardianName: "Aisha B.", phone: "+2348000000000" });
    expect(onSaved).toHaveBeenCalledWith({ guardianName: "Aisha B.", phone: "+2348000000000" });
  });

  it("rejects a whitespace-only name without calling updateDoc", async () => {
    render(<PortalProfileForm uid="u1" parent={fakeParent} onSaved={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "Edit" }));
    const nameInput = screen.getByLabelText("Name");
    await userEvent.clear(nameInput);
    // A real empty value is blocked by the input's own `required` attribute before
    // this handler even runs, so exercise the case that attribute can't catch:
    // whitespace that only fails once trimmed.
    await userEvent.type(nameInput, "   ");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Name is required.")).toBeInTheDocument();
    expect(updateDoc).not.toHaveBeenCalled();
  });

  it("shows an error and stays editable when the write fails", async () => {
    updateDoc.mockRejectedValue(new Error("permission-denied"));

    render(<PortalProfileForm uid="u1" parent={fakeParent} onSaved={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "Edit" }));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Couldn’t save your changes. Please try again.")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
  });

  it("cancels editing without saving", async () => {
    render(<PortalProfileForm uid="u1" parent={fakeParent} onSaved={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "Edit" }));
    await userEvent.clear(screen.getByLabelText("Name"));
    await userEvent.type(screen.getByLabelText("Name"), "Someone Else");
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.getByText("Aisha")).toBeInTheDocument();
    expect(updateDoc).not.toHaveBeenCalled();
  });
});
