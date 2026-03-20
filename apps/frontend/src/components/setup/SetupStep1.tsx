import { FormEvent, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ui } from "@/lib/ui";

export function SetupStep1({ onComplete }: { onComplete: () => void }) {
  const { register } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      onComplete();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Setup failed";
      setError(msg);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className={ui.h2}>Create Admin Account</h2>
        <p className="text-sm text-text-secondary">This will be the first admin user.</p>
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
        <button className={`${ui.btn} ${ui.btnPrimary} w-full`} type="submit" disabled={pending}>
          {pending ? "Creating..." : "Create admin account"}
        </button>
      </form>
    </div>
  );
}
