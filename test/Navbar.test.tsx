import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import Navbar from "@/components/Navbar";

describe("Navbar", () => {
  it("hides the mobile link panel until the toggle is clicked", async () => {
    const user = userEvent.setup();
    render(<Navbar />);

    expect(screen.queryByRole("navigation", { name: "Mobile" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Toggle navigation menu" }));

    const mobileNav = screen.getByRole("navigation", { name: "Mobile" });
    expect(within(mobileNav).getByText("Admissions")).toBeInTheDocument();
    expect(within(mobileNav).getByText("Portal")).toBeInTheDocument();
  });

  it("closes the mobile panel when a link is clicked", async () => {
    const user = userEvent.setup();
    render(<Navbar />);

    await user.click(screen.getByRole("button", { name: "Toggle navigation menu" }));
    const mobileNav = screen.getByRole("navigation", { name: "Mobile" });

    await user.click(within(mobileNav).getByText("Admissions"));

    expect(screen.queryByRole("navigation", { name: "Mobile" })).not.toBeInTheDocument();
  });
});
