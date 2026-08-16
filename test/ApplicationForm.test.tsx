import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import ApplicationForm from "@/components/ApplicationForm";

async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Child’s full name"), "Femi Okafor");
  fireEvent.change(screen.getByLabelText("Child’s date of birth"), { target: { value: "2021-03-01" } });
  await user.type(screen.getByLabelText("Parent/guardian full name"), "Aisha Okafor");
  await user.type(screen.getByLabelText("Email"), "a@b.com");
}

describe("ApplicationForm", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("submits the form and shows a success message", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    render(<ApplicationForm />);

    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: "Submit Application" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admissions/apply",
      expect.objectContaining({ method: "POST" })
    );
    expect(
      await screen.findByText(/we.ve received your application/i)
    ).toBeInTheDocument();
  });

  it("shows an error message when the request fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Please select a valid stage" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    render(<ApplicationForm />);

    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: "Submit Application" }));

    expect(await screen.findByText("Please select a valid stage")).toBeInTheDocument();
  });

  it("does not submit when neither email nor phone is provided", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    render(<ApplicationForm />);

    await user.type(screen.getByLabelText("Child’s full name"), "Femi Okafor");
    fireEvent.change(screen.getByLabelText("Child’s date of birth"), { target: { value: "2021-03-01" } });
    await user.type(screen.getByLabelText("Parent/guardian full name"), "Aisha Okafor");
    await user.click(screen.getByRole("button", { name: "Submit Application" }));

    expect(
      await screen.findByText("Provide an email or phone number so we can reply.")
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
