import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import NewsletterSignupForm from "@/components/NewsletterSignupForm";

describe("NewsletterSignupForm", () => {
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
    render(<NewsletterSignupForm />);

    await user.type(screen.getByLabelText("Email address"), "aisha@example.com");
    await user.click(screen.getByRole("button", { name: "Sign up" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/newsletter",
      expect.objectContaining({ method: "POST" })
    );
    expect(await screen.findByText(/on the list/i)).toBeInTheDocument();
  });

  it("shows an error message when the request fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Too many requests. Please try again later." }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    render(<NewsletterSignupForm />);

    await user.type(screen.getByLabelText("Email address"), "aisha@example.com");
    await user.click(screen.getByRole("button", { name: "Sign up" }));

    expect(await screen.findByText("Too many requests. Please try again later.")).toBeInTheDocument();
  });

  it("does not submit when the email is empty", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    render(<NewsletterSignupForm />);

    await user.click(screen.getByRole("button", { name: "Sign up" }));

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
