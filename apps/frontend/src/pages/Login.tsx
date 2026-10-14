import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AuthShell } from "@/components/AuthShell";
import { formString } from "@/lib/format-utils";
import { PasswordInput } from "@/components/PasswordInput";
import { ui } from "@/lib/ui";
import { getErrorMessage } from "@/lib/api-error";
import { BrandLogo } from "@/components/BrandLogo";

const API_URL = import.meta.env.VITE_API_URL ?? "";

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle OAuth error redirect
  useEffect(() => {
    if (searchParams.get("error") === "oauth_failed") {
      setError("Sign-in failed. Please try again.");
    }
  }, [searchParams]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const email = formString(formData, "email");
    const password = formString(formData, "password");

    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err: unknown) {
      const msg = getErrorMessage(err, "Authentication failed");
      setError(msg);
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthShell>
      <div className="space-y-2 text-center">
        <BrandLogo alt="Drawhaus" className="mx-auto h-10 w-10" />
        <h1 className={ui.h1}>Welcome back</h1>
        <p className="text-sm text-text-secondary">Sign in to your Drawhaus instance.</p>
      </div>

      {/* Tab toggle */}
      <nav aria-label="Account" className="flex rounded-lg bg-surface p-1">
        <span
          aria-current="page"
          className="flex-1 rounded-md bg-primary px-3 py-1.5 text-center text-sm font-medium text-on-primary"
        >
          Log in
        </span>
        <Link
          to="/register"
          className="flex-1 rounded-md px-3 py-1.5 text-center text-sm font-medium text-text-muted hover:text-text-primary transition-colors"
        >
          Create account
        </Link>
      </nav>

      {/* Social login */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => {
            globalThis.location.href = `${API_URL}/api/auth/google`;
          }}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-border py-2.5 text-sm font-medium text-text-primary transition hover:bg-surface"
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Continue with Google
        </button>
        <button
          type="button"
          onClick={() => {
            globalThis.location.href = `${API_URL}/api/auth/github`;
          }}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-border py-2.5 text-sm font-medium text-text-primary transition hover:bg-surface"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
          </svg>
          Continue with GitHub
        </button>
      </div>

      {/* Divider */}
      <div className="relative flex items-center justify-center py-2">
        <div className="w-full border-t border-border" />
        <span className="absolute bg-surface-raised px-4 text-xs font-medium uppercase tracking-widest text-text-muted">
          or
        </span>
      </div>

      <form className="space-y-4" onSubmit={onSubmit}>
        <label className={ui.label}>
          <span>Email</span>
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
            <input
              className={`${ui.input} pl-10`}
              type="email"
              name="email"
              placeholder="you@example.com"
              required
            />
          </div>
        </label>
        <label className={ui.label}>
          <div className="flex items-center justify-between">
            <span>Password</span>
            <Link
              to="/forgot-password"
              className="text-xs font-medium text-primary hover:underline"
            >
              Forgot?
            </Link>
          </div>
          <PasswordInput name="password" placeholder="Enter your password" minLength={8} required />
        </label>
        {error && (
          <p role="alert" className={ui.alertError}>
            {error}
          </p>
        )}
        <button
          className={`${ui.btn} ${ui.btnPrimary} mt-1 w-full gap-2`}
          type="submit"
          disabled={pending}
        >
          {pending ? "Please wait..." : "Continue"}
          {!pending && (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          )}
        </button>
      </form>

      {/* Footer */}
      <div className="text-center">
        <p className="text-xs text-text-muted">
          By continuing, you agree to our{" "}
          <Link to="/terms" className="text-text-secondary underline">
            Terms
          </Link>{" "}
          and{" "}
          <Link to="/privacy" className="text-text-secondary underline">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </AuthShell>
  );
}
