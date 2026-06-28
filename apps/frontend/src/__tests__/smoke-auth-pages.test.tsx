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
    await waitFor(() => expect(screen.getByRole("heading", { name: /set new password/i })).toBeTruthy());
  });
});
