import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ui } from "@/lib/ui";

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
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
      navigate("/dashboard");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Registration failed";
      setError(msg);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-surface px-4 py-8">
      <section className={`${ui.card} w-full max-w-md space-y-6`}>
        <div className="space-y-2 text-center">
          <img src="/logo-icon.svg" alt="Drawhaus" className="mx-auto h-10 w-10" />
          <h1 className={ui.h1}>Create account</h1>
          <p className="text-sm text-text-secondary">Start diagramming on your own server.</p>
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
            {pending ? "Please wait..." : "Create account"}
          </button>
        </form>
        <p className="text-center text-sm text-text-secondary">
          Already have an account?{" "}
          <Link className="font-semibold text-primary hover:text-primary-hover" to="/login">Sign in</Link>
        </p>
      </section>
    </div>
  );
}
