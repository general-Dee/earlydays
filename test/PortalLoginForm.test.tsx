import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PortalLoginForm from "@/components/PortalLoginForm";

const signInWithEmailAndPassword = vi.fn();
const sendPasswordResetEmail = vi.fn();

vi.mock("firebase/auth", () => ({
  signInWithEmailAndPassword: (...args: unknown[]) => signInWithEmailAndPassword(...args),
  sendPasswordResetEmail: (...args: unknown[]) => sendPasswordResetEmail(...args),
}));

vi.mock("@/lib/firebase/client", () => ({
  getFirebaseAuth: () => "fake-auth",
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PortalLoginForm", () => {
  it("logs in with the entered email and password", async () => {
    signInWithEmailAndPassword.mockResolvedValue({});
    const user = userEvent.setup();
    render(<PortalLoginForm />);

    await user.type(screen.getByLabelText("Email"), "parent@example.com");
    await user.type(screen.getByLabelText("Password"), "secret123");
    await user.click(screen.getByRole("button", { name: "Log In" }));

    expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
      "fake-auth",
      "parent@example.com",
      "secret123"
    );
  });

  it("shows a friendly error when login fails", async () => {
    signInWithEmailAndPassword.mockRejectedValue({ code: "auth/wrong-password" });
    const user = userEvent.setup();
    render(<PortalLoginForm />);

    await user.type(screen.getByLabelText("Email"), "parent@example.com");
    await user.type(screen.getByLabelText("Password"), "wrong");
    await user.click(screen.getByRole("button", { name: "Log In" }));

    expect(await screen.findByText("Email or password is incorrect.")).toBeInTheDocument();
  });

  it("shows a deactivated-account message for a disabled login", async () => {
    signInWithEmailAndPassword.mockRejectedValue({ code: "auth/user-disabled" });
    const user = userEvent.setup();
    render(<PortalLoginForm />);

    await user.type(screen.getByLabelText("Email"), "parent@example.com");
    await user.type(screen.getByLabelText("Password"), "secret123");
    await user.click(screen.getByRole("button", { name: "Log In" }));

    expect(
      await screen.findByText("This account has been deactivated. Contact the school office.")
    ).toBeInTheDocument();
  });

  it("prompts for an email before sending a reset link", async () => {
    const user = userEvent.setup();
    render(<PortalLoginForm />);

    await user.click(screen.getByRole("button", { name: "Forgot password?" }));

    expect(
      await screen.findByText('Enter your email above first, then tap "Forgot password".')
    ).toBeInTheDocument();
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it("sends a reset email when an email is present", async () => {
    sendPasswordResetEmail.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<PortalLoginForm />);

    await user.type(screen.getByLabelText("Email"), "parent@example.com");
    await user.click(screen.getByRole("button", { name: "Forgot password?" }));

    expect(sendPasswordResetEmail).toHaveBeenCalledWith("fake-auth", "parent@example.com");
    expect(await screen.findByText("Password reset email sent — check your inbox.")).toBeInTheDocument();
  });
});
