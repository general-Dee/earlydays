import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import ApplicationStatusForm from "@/components/ApplicationStatusForm";

describe("ApplicationStatusForm", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("submits the reference code and shows the returned status", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: "accepted",
        childName: "Femi Okafor",
        desiredStage: "CR",
        submittedAt: 12345,
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    render(<ApplicationStatusForm />);

    await user.type(screen.getByLabelText("Reference code"), "A1B2C3D4");
    await user.click(screen.getByRole("button", { name: "Check Status" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admissions/status",
      expect.objectContaining({ method: "POST" })
    );
    expect(await screen.findByText("accepted")).toBeInTheDocument();
    expect(screen.getByText(/Femi Okafor/)).toBeInTheDocument();
  });

  it("shows an error message when no application matches", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "No matching application found. Double-check your reference code." }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    render(<ApplicationStatusForm />);

    await user.type(screen.getByLabelText("Reference code"), "ZZZZZZZZ");
    await user.click(screen.getByRole("button", { name: "Check Status" }));

    expect(
      await screen.findByText("No matching application found. Double-check your reference code.")
    ).toBeInTheDocument();
  });

  it("lets the user check another application after a result", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: "new",
        childName: "Femi Okafor",
        desiredStage: "CR",
        submittedAt: 12345,
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    render(<ApplicationStatusForm />);

    await user.type(screen.getByLabelText("Reference code"), "A1B2C3D4");
    await user.click(screen.getByRole("button", { name: "Check Status" }));

    expect(await screen.findByText("new")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Check another application" }));

    expect(screen.getByLabelText("Reference code")).toHaveValue("");
  });
});
