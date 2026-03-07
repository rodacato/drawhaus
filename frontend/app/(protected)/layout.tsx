import { ReactNode } from "react";
import { requireUser } from "@/lib/auth";

export default async function ProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireUser();
  return <>{children}</>;
}
