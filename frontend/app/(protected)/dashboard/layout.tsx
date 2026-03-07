import { ReactNode } from "react";
import { getCurrentUser } from "@/lib/auth";
import { AppShell } from "../AppShell";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen bg-surface">
      <AppShell user={user!} />
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
