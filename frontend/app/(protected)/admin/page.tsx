import { cookies } from "next/headers";
import Link from "next/link";
import { getBackendUrl } from "@/lib/backend";
import { ui } from "@/lib/ui";

type Metrics = {
  totalUsers: number;
  totalDiagrams: number;
  activeSessions: number;
};

async function getMetrics(): Promise<Metrics | null> {
  const cookieHeader = (await cookies()).toString();
  const res = await fetch(`${getBackendUrl()}/api/admin/metrics`, {
    headers: { cookie: cookieHeader },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { metrics: Metrics };
  return data.metrics;
}

export default async function AdminPage() {
  const metrics = await getMetrics();

  return (
    <div className="space-y-6">
      <div>
        <h1 className={ui.h1}>Admin Panel</h1>
        <p className={ui.subtitle}>Manage your Drawhaus instance.</p>
      </div>

      {metrics && (
        <div className="grid grid-cols-3 gap-4">
          <div className={ui.card}>
            <p className={ui.muted}>Total Users</p>
            <p className="mt-1 text-3xl font-bold text-text-primary">{metrics.totalUsers}</p>
          </div>
          <div className={ui.card}>
            <p className={ui.muted}>Total Diagrams</p>
            <p className="mt-1 text-3xl font-bold text-text-primary">{metrics.totalDiagrams}</p>
          </div>
          <div className={ui.card}>
            <p className={ui.muted}>Active Sessions</p>
            <p className="mt-1 text-3xl font-bold text-text-primary">{metrics.activeSessions}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Link href="/admin/users" className={`${ui.card} block hover:border-accent transition-colors`}>
          <h2 className={ui.h2}>Users</h2>
          <p className={ui.muted}>Manage users, roles, and access.</p>
        </Link>
        <Link href="/admin/settings" className={`${ui.card} block hover:border-accent transition-colors`}>
          <h2 className={ui.h2}>Site Settings</h2>
          <p className={ui.muted}>Registration, instance name, and more.</p>
        </Link>
      </div>
    </div>
  );
}
