import { FormEvent, useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { authApi } from "@/api/auth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ui } from "@/lib/ui";

export function ResetPassword() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [valid, setValid] = useState<boolean | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!token) return;
    authApi.validateResetToken(token).then((r) => setValid(r.valid)).catch(() => setValid(false));
  }, [token]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    setPending(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const newPassword = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      setPending(false);
      return;
    }

    try {
      await authApi.resetPassword(token, newPassword);
      navigate("/login", { replace: true });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Failed to reset password";
      setError(msg);
    } finally {
      setPending(false);
    }
  }

  if (valid === null) {
    return (
      <div className="grid min-h-screen place-items-center bg-surface">
        <p className="text-text-muted text-sm">Validating reset link...</p>
      </div>
    );
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
          <h1 className={ui.h1}>Set new password</h1>
        </div>

        {!valid ? (
          <div className="space-y-4">
            <p className={ui.alertError}>This reset link is invalid or has expired.</p>
            <div className="text-center">
              <Link to="/forgot-password" className="text-sm font-medium text-primary hover:underline">
                Request a new reset link
              </Link>
            </div>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={onSubmit}>
            <label className={ui.label}>
              <span>New password</span>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                <input className={`${ui.input} pl-10 pr-10`} type={showPassword ? "text" : "password"} name="password" placeholder="Minimum 8 characters" minLength={8} required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors">
                  {showPassword ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                  )}
                </button>
              </div>
            </label>
            <label className={ui.label}>
              <span>Confirm password</span>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                <input className={`${ui.input} pl-10`} type={showPassword ? "text" : "password"} name="confirmPassword" placeholder="Repeat your password" minLength={8} required />
              </div>
            </label>
            {error && <p className={ui.alertError}>{error}</p>}
            <button className={`${ui.btn} ${ui.btnPrimary} w-full`} type="submit" disabled={pending}>
              {pending ? "Resetting..." : "Reset password"}
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
