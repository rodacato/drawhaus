import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getBackendUrl } from "./backend";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
};

type MeResponse = {
  user: AuthUser;
};

export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  if (!cookieHeader) {
    return null;
  }

  const response = await fetch(`${getBackendUrl()}/api/auth/me`, {
    method: "GET",
    headers: {
      cookie: cookieHeader,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as MeResponse;
  return payload.user;
}

export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}
