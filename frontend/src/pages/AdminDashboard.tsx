import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminApi } from "@/api/admin";
import { ui } from "@/lib/ui";

type Metrics = { totalUsers: number; totalDiagrams: number; activeSessions: number };

export function AdminDashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  useEffect(() => {
    adminApi.getMetrics().then((data) => setMetrics(data.metrics ?? data)).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className={ui.h1}>Admin Panel</h1>
        <p className={ui.subtitle}>Manage your Drawhaus instance.</p>
      </div>
      {metrics && (
        <div className="grid grid-cols-3 gap-4">
          <div className={ui.card}><p className={ui.muted}>Total Users</p><p className="mt-1 text-3xl font-bold text-text-primary">{metrics.totalUsers}</p></div>
          <div className={ui.card}><p className={ui.muted}>Total Diagrams</p><p className="mt-1 text-3xl font-bold text-text-primary">{metrics.totalDiagrams}</p></div>
          <div className={ui.card}><p className={ui.muted}>Active Sessions</p><p className="mt-1 text-3xl font-bold text-text-primary">{metrics.activeSessions}</p></div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <Link to="/admin/users" className={`${ui.card} block hover:border-primary transition-colors`}><h2 className={ui.h2}>Users</h2><p className={ui.muted}>Manage users, roles, and access.</p></Link>
        <Link to="/admin/settings" className={`${ui.card} block hover:border-primary transition-colors`}><h2 className={ui.h2}>Site Settings</h2><p className={ui.muted}>Registration, instance name, and more.</p></Link>
        <Link to="/admin/style-guide" className={`${ui.card} block hover:border-primary transition-colors`}><h2 className={ui.h2}>Style Guide</h2><p className={ui.muted}>Brand colors, typography, logos, and UI components.</p></Link>
      </div>
    </div>
  );
}
