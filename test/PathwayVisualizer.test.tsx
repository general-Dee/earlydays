import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import PathwayVisualizer from "@/components/PathwayVisualizer";
import { stages } from "@/lib/data";

describe("PathwayVisualizer", () => {
  it("shows the first stage's detail by default", () => {
    render(<PathwayVisualizer />);
    expect(screen.getByRole("heading", { name: stages[0].name })).toBeInTheDocument();
    expect(screen.getByText(stages[0].desc)).toBeInTheDocument();
  });

  it("switches stage detail when a different stage button is clicked", async () => {
    const user = userEvent.setup();
    render(<PathwayVisualizer />);

    const target = stages[2];
    await user.click(screen.getByRole("button", { name: new RegExp(target.name) }));

    expect(screen.getByRole("heading", { name: target.name })).toBeInTheDocument();
    expect(screen.getByText(target.desc)).toBeInTheDocument();
  });
});
