import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PortalPayPanel from "@/components/PortalPayPanel";

const usePaystackFeePayment = vi.fn();
const pay = vi.fn();

vi.mock("@/lib/usePaystackFeePayment", () => ({
  usePaystackFeePayment: (...args: unknown[]) => usePaystackFeePayment(...args),
}));

vi.mock("next/script", () => ({
  default: () => null,
}));

const fakeUser = { uid: "u1", getIdToken: vi.fn() } as any;

const fakeParent = {
  children: [
    { id: "c1", name: "Zainab", stage: "N1" },
    { id: "c2", name: "Musa", stage: "N2" },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  usePaystackFeePayment.mockReturnValue({ payStatus: "idle", message: null, receiptReference: null, pay });
});

describe("PortalPayPanel", () => {
  it("renders nothing when there are no children to pay for", () => {
    const { container } = render(<PortalPayPanel user={fakeUser} parent={{ children: [] }} onPaid={vi.fn()} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("defaults to the first child and pays for the selected child/term", async () => {
    render(<PortalPayPanel user={fakeUser} parent={fakeParent} onPaid={vi.fn()} />);

    const [childSelect] = screen.getAllByRole("combobox");
    await userEvent.selectOptions(childSelect, "c2");
    await userEvent.click(screen.getByRole("button", { name: "Pay Fees Now" }));

    expect(pay).toHaveBeenCalledWith("c2", expect.any(String));
  });

  it("disables the button and shows a processing label while starting/verifying", () => {
    usePaystackFeePayment.mockReturnValue({ payStatus: "starting", message: null, receiptReference: null, pay });
    render(<PortalPayPanel user={fakeUser} parent={fakeParent} onPaid={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Processing…" })).toBeDisabled();
  });

  it("shows the confirmation message and receipt link from the hook", () => {
    usePaystackFeePayment.mockReturnValue({
      payStatus: "success",
      message: "Payment confirmed — thank you!",
      receiptReference: "edy_1",
      pay,
    });
    render(<PortalPayPanel user={fakeUser} parent={fakeParent} onPaid={vi.fn()} />);

    expect(screen.getByText("Payment confirmed — thank you!")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View receipt →" })).toHaveAttribute("href", "/portal/receipts/edy_1");
  });

  it("calls onPaid once payStatus transitions to success", () => {
    const onPaid = vi.fn();
    const { rerender } = render(<PortalPayPanel user={fakeUser} parent={fakeParent} onPaid={onPaid} />);

    expect(onPaid).not.toHaveBeenCalled();

    usePaystackFeePayment.mockReturnValue({
      payStatus: "success",
      message: "Payment confirmed — thank you!",
      receiptReference: "edy_1",
      pay,
    });
    rerender(<PortalPayPanel user={fakeUser} parent={fakeParent} onPaid={onPaid} />);

    expect(onPaid).toHaveBeenCalledTimes(1);
  });
});
