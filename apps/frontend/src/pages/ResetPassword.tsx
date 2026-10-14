import { FormEvent, useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { authApi } from "@/api/auth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { formString } from "@/lib/format-utils";
import { PasswordInput } from "@/components/PasswordInput";
import { ui } from "@/lib/ui";
import { getErrorMessage } from "@/lib/api-error";
import { BrandLogo } from "@/components/BrandLogo";

export function ResetPassword() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [valid, setValid] = useState<boolean | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!token) return;
    authApi
      .validateResetToken(token)
      .then((r) => setValid(r.valid))
      .catch(() => setValid(false));
  }, [token]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    setPending(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const newPassword = formString(formData, "password");
    const confirmPassword = formString(formData, "confirmPassword");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      setPending(false);
      return;
    }

    try {
      await authApi.resetPassword(token, newPassword);
      navigate("/login", { replace: true });
    } catch (err: unknown) {
      const msg = getErrorMessage(err, "Failed to reset password");
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
          <BrandLogo alt="Drawhaus" className="mx-auto h-10 w-10" />
          <h1 className={ui.h1}>Set new password</h1>
        </div>

        {valid ? (
          <form className="space-y-4" onSubmit={onSubmit}>
            <label className={ui.label}>
              <span>New password</span>
              <PasswordInput
                name="password"
                placeholder="Minimum 8 characters"
                minLength={8}
                required
                visible={showPassword}
                onVisibleChange={setShowPassword}
              />
            </label>
            <label className={ui.label}>
              <span>Confirm password</span>
              <PasswordInput
                name="confirmPassword"
                placeholder="Repeat your password"
                minLength={8}
                required
                visible={showPassword}
                showToggle={false}
              />
            </label>
            {error && (
              <p role="alert" className={ui.alertError}>
                {error}
              </p>
            )}
            <button
              className={`${ui.btn} ${ui.btnPrimary} w-full`}
              type="submit"
              disabled={pending}
            >
              {pending ? "Resetting..." : "Reset password"}
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <p role="alert" className={ui.alertError}>
              This reset link is invalid or has expired.
            </p>
            <div className="text-center">
              <Link
                to="/forgot-password"
                className="text-sm font-medium text-primary hover:underline"
              >
                Request a new reset link
              </Link>
            </div>
          </div>
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
