"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ui } from "@/lib/ui";

type AuthMode = "login" | "register";

type AuthFormProps = {
  mode: AuthMode;
};

export default function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const name = String(formData.get("name") ?? "");

    const endpoint = mode === "register" ? "/api/auth/register" : "/api/auth/login";
    const payload =
      mode === "register" ? { email, name, password } : { email, password };

    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });
    } catch {
      setError("Cannot reach backend. Verify backend is running.");
      setPending(false);
      return;
    }

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setError(body?.error ?? "Authentication failed");
      setPending(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="grid min-h-screen place-items-center bg-surface px-4 py-8">
      <section className={`${ui.card} w-full max-w-md space-y-6`}>
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">
            Drawhaus
          </p>
          <h1 className={ui.h1}>
            {mode === "register" ? "Create account" : "Welcome back"}
          </h1>
          <p className="text-sm text-text-secondary">
            {mode === "register"
              ? "Register to start using Drawhaus."
              : "Sign in to access your dashboard."}
          </p>
        </div>

        <form className="space-y-4" onSubmit={onSubmit}>
          {mode === "register" && (
            <label className={ui.label}>
              <span>Name</span>
              <input className={ui.input} type="text" name="name" required />
            </label>
          )}

          <label className={ui.label}>
            <span>Email</span>
            <input className={ui.input} type="email" name="email" required />
          </label>

          <label className={ui.label}>
            <span>Password</span>
            <input className={ui.input} type="password" name="password" minLength={8} required />
          </label>

          {error && <p className={ui.alertError}>{error}</p>}

          <button
            className={`${ui.btn} ${ui.btnPrimary} mt-1 w-full`}
            type="submit"
            disabled={pending}
          >
            {pending
              ? "Please wait..."
              : mode === "register"
                ? "Create account"
                : "Sign in"}
          </button>
        </form>

        <p className="text-sm text-text-secondary">
          {mode === "register" ? "Already have an account? " : "New to Drawhaus? "}
          <Link
            className="font-semibold text-accent hover:text-accent-hover"
            href={mode === "register" ? "/login" : "/register"}
          >
            {mode === "register" ? "Login" : "Create one"}
          </Link>
        </p>
      </section>
    </div>
  );
}
