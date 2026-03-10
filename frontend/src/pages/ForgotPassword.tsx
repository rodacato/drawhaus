import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { authApi } from "@/api/auth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ui } from "@/lib/ui";

export function ForgotPassword() {
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");

    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="relative grid min-h-screen place-items-center bg-surface px-4 py-8 overflow-hidden">
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-accent-coral/10 blur-3xl" />

      <div className="fixed right-4 top-4 z-10">
        <ThemeToggle />
      </div>

      <section className={`${ui.card} relative w-full max-w-110 space-y-6`}>
        <div className="space-y-2 text-center">
          <img src="/logo-icon.svg" alt="Drawhaus" className="mx-auto h-10 w-10" />
          <h1 className={ui.h1}>Reset your password</h1>
          <p className="text-sm text-text-secondary">
            Enter the email address associated with your account and we'll send you a link to reset your password.
          </p>
        </div>

        {sent ? (
          <div className={ui.alertSuccess}>
            If an account with that email exists, we've sent a password reset link. Check your inbox.
          </div>
        ) : (
          <form className="space-y-4" onSubmit={onSubmit}>
            <label className={ui.label}>
              <span>Email</span>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
                <input className={`${ui.input} pl-10`} type="email" name="email" placeholder="you@example.com" required />
              </div>
            </label>
            {error && <p className={ui.alertError}>{error}</p>}
            <button className={`${ui.btn} ${ui.btnPrimary} w-full`} type="submit" disabled={pending}>
              {pending ? "Sending..." : "Send reset link"}
            </button>
          </form>
        )}

        <div className="text-center">
          <Link to="/login" className="text-sm font-medium text-primary hover:underline">
            Back to login
          </Link>
        </div>
      </section>
    </div>
  );
}
