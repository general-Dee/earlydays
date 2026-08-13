import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DayInLife from "@/components/DayInLife";
import { daySchedules } from "@/lib/data";

describe("DayInLife", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("auto-advances to the next step after the interval elapses", () => {
    render(<DayInLife />);

    expect(screen.getByText(daySchedules[0].schedule[0].title)).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3800);
    });

    expect(screen.getByText(daySchedules[0].schedule[1].title)).toBeInTheDocument();
  });

  it("resets to the first step when switching to a different day", () => {
    render(<DayInLife />);

    act(() => {
      vi.advanceTimersByTime(3800);
    });
    expect(screen.getByText(daySchedules[0].schedule[1].title)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: daySchedules[1].name }));

    expect(screen.getByText(daySchedules[1].schedule[0].title)).toBeInTheDocument();
  });
});
