import { describe, test, expect, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "./_helpers/render";
import { Login } from "../pages/Login";
import { Register } from "../pages/Register";
import { ForgotPassword } from "../pages/ForgotPassword";
import { ResetPassword } from "../pages/ResetPassword";

vi.mock("@/api/auth", () => ({
  authApi: {
    getMe: vi.fn().mockRejectedValue(new Error("no session")),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
    validateResetToken: vi.fn().mockResolvedValue({ valid: true }),
    resolveInvite: vi.fn(),
    acceptInvite: vi.fn(),
  },
}));

describe("auth pages — smoke (render without crashing)", () => {
  test("Login renders its heading", () => {
    renderWithProviders(<Login />);
    expect(screen.getByRole("heading", { name: /welcome back/i })).toBeTruthy();
  });

  test("Login keeps its email field, its password field and the forgot link", () => {
    renderWithProviders(<Login />);
    expect(screen.getByPlaceholderText("you@example.com").getAttribute("type")).toBe("email");
    expect(screen.getByPlaceholderText("Enter your password").getAttribute("type")).toBe(
      "password",
    );
    expect(screen.getByRole("button", { name: "Show password" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Forgot?" })).toBeTruthy();
  });

  test("Register keeps name, email and a password field with a toggle", () => {
    renderWithProviders(<Register />);
    expect(screen.getByPlaceholderText("you@example.com").getAttribute("type")).toBe("email");
    expect(screen.getByPlaceholderText("Min. 8 characters").getAttribute("type")).toBe("password");
    expect(screen.getAllByRole("textbox").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole("button", { name: "Show password" })).toBeTruthy();
  });

  test("Register renders its heading", () => {
    renderWithProviders(<Register />);
    expect(screen.getByRole("heading", { name: /get started/i })).toBeTruthy();
  });

  test("ForgotPassword renders its heading", () => {
    renderWithProviders(<ForgotPassword />);
    expect(screen.getByRole("heading", { name: /reset your password/i })).toBeTruthy();
  });

  test("ResetPassword renders once the token validates", async () => {
    renderWithProviders(<ResetPassword />, { route: "/reset/tok123", path: "/reset/:token" });
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: /set new password/i })).toBeTruthy(),
    );
  });
});
