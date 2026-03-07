import { cookies } from "next/headers";
import Link from "next/link";
import DashboardActions from "./actions";
import { getBackendUrl } from "@/lib/backend";
import { ui } from "@/lib/ui";

type Diagram = {
  id: string;
  title: string;
  updatedAt?: string;
  updated_at?: string;
};

async function getDiagrams(): Promise<Diagram[]> {
  const cookieHeader = (await cookies()).toString();
  const response = await fetch(`${getBackendUrl()}/api/diagrams`, {
    method: "GET",
    headers: {
      cookie: cookieHeader,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as { diagrams?: Diagram[] } | Diagram[];

  if (Array.isArray(payload)) {
    return payload;
  }

  return payload.diagrams ?? [];
}

export default async function DashboardPage() {
  const diagrams = await getDiagrams();

  return (
    <div className="space-y-6">
      <div>
        <h1 className={ui.h1}>Dashboard</h1>
        <p className={ui.subtitle}>Manage your boards and start a new one.</p>
      </div>

      <div className={ui.card}>
        <DashboardActions />

        {diagrams.length === 0 ? (
          <div className={ui.empty}>
            You do not have diagrams yet. Create your first one from this page.
          </div>
        ) : (
          <div className="grid gap-3">
            {diagrams.map((diagram) => (
              <article
                className="flex items-center justify-between rounded-xl border border-border bg-surface p-4"
                key={diagram.id}
              >
                <div>
                  <h2 className={ui.h2}>{diagram.title || "Untitled"}</h2>
                  <p className={ui.muted}>
                    Updated: {diagram.updatedAt ?? diagram.updated_at ?? "unknown"}
                  </p>
                </div>
                <Link className={`${ui.btn} ${ui.btnSecondary}`} href={`/board/${diagram.id}`}>
                  Open board
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
