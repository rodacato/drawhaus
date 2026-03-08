import { requireUser } from "@/lib/auth";
import { ui } from "@/lib/ui";
import SettingsForm from "./SettingsForm";

export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <div className="space-y-6">
      <div>
        <h1 className={ui.h1}>Settings</h1>
        <p className={ui.subtitle}>Manage your profile and security.</p>
      </div>
      <SettingsForm user={user} />
    </div>
  );
}
