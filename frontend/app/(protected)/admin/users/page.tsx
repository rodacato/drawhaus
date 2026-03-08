import { cookies } from "next/headers";
import { getBackendUrl } from "@/lib/backend";
import { requireAdmin } from "@/lib/auth";
import { ui } from "@/lib/ui";
import UserList from "./UserList";

type AdminUser = {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin";
  disabled: boolean;
  createdAt: string;
};

async function getUsers(): Promise<AdminUser[]> {
  const cookieHeader = (await cookies()).toString();
  const res = await fetch(`${getBackendUrl()}/api/admin/users`, {
    headers: { cookie: cookieHeader },
    cache: "no-store",
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { users: AdminUser[] };
  return data.users;
}

export default async function AdminUsersPage() {
  const currentUser = await requireAdmin();
  const users = await getUsers();

  return (
    <div className="space-y-6">
      <div>
        <h1 className={ui.h1}>Users</h1>
        <p className={ui.subtitle}>Manage user roles and access.</p>
      </div>
      <UserList users={users} currentUserId={currentUser.id} />
    </div>
  );
}
