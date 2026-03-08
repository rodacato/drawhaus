import { cookies } from "next/headers";
import { getBackendUrl } from "@/lib/backend";
import { ui } from "@/lib/ui";
import SiteSettingsForm from "./SiteSettingsForm";

type SiteSettings = {
  registrationOpen: boolean;
  instanceName: string;
};

async function getSettings(): Promise<SiteSettings | null> {
  const cookieHeader = (await cookies()).toString();
  const res = await fetch(`${getBackendUrl()}/api/admin/settings`, {
    headers: { cookie: cookieHeader },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { settings: SiteSettings };
  return data.settings;
}

export default async function AdminSettingsPage() {
  const settings = await getSettings();

  return (
    <div className="space-y-6">
      <div>
        <h1 className={ui.h1}>Site Settings</h1>
        <p className={ui.subtitle}>Configure your Drawhaus instance.</p>
      </div>
      {settings ? (
        <SiteSettingsForm initialSettings={settings} />
      ) : (
        <div className={ui.alertError}>Failed to load settings.</div>
      )}
    </div>
  );
}
