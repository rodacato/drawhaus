import { FormEvent, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { authApi } from "@/api/auth";
import { ui } from "@/lib/ui";

export function Setup() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    authApi.getSetupStatus().then(({ needsSetup }) => {
      if (!needsSetup) navigate("/login", { replace: true });
      else setChecking(false);
    }).catch(() => {
      navigate("/login", { replace: true });
    });
  }, [navigate]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "");
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    try {
      await register(name, email, password);
      navigate("/dashboard");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Setup failed";
      setError(msg);
    } finally {
      setPending(false);
    }
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="text-sm text-text-muted">Loading...</div>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen place-items-center bg-surface px-4 py-8">
      <section className={`${ui.card} w-full max-w-md space-y-6`}>
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">Drawhaus</p>
          <h1 className={ui.h1}>Setup</h1>
          <p className="text-sm text-text-secondary">Create the administrator account to get started.</p>
        </div>
        <form className="space-y-4" onSubmit={onSubmit}>
          <label className={ui.label}>
            <span>Name</span>
            <input className={ui.input} type="text" name="name" required />
          </label>
          <label className={ui.label}>
            <span>Email</span>
            <input className={ui.input} type="email" name="email" required />
          </label>
          <label className={ui.label}>
            <span>Password</span>
            <input className={ui.input} type="password" name="password" minLength={8} required />
          </label>
          {error && <p className={ui.alertError}>{error}</p>}
          <button className={`${ui.btn} ${ui.btnPrimary} mt-1 w-full`} type="submit" disabled={pending}>
            {pending ? "Please wait..." : "Create admin account"}
          </button>
        </form>
      </section>
    </div>
  );
}
