import { cookies } from "next/headers";
import Link from "next/link";
import { getBackendUrl } from "@/lib/backend";
import { ui } from "@/lib/ui";
import DashboardActions from "./actions";
import DashboardSidebar from "./DashboardSidebar";
import MoveToMenuClient from "./MoveToMenu";

type Diagram = {
  id: string;
  title: string;
  folderId: string | null;
  thumbnail: string | null;
  updatedAt?: string;
  updated_at?: string;
};

type Folder = {
  id: string;
  name: string;
};

async function getFolders(): Promise<Folder[]> {
  const cookieHeader = (await cookies()).toString();
  const res = await fetch(`${getBackendUrl()}/api/folders`, {
    headers: { cookie: cookieHeader },
    cache: "no-store",
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { folders: Folder[] };
  return data.folders;
}

async function getDiagrams(folderId?: string | null, search?: string): Promise<Diagram[]> {
  const cookieHeader = (await cookies()).toString();
  let url = `${getBackendUrl()}/api/diagrams`;

  if (search) {
    url = `${getBackendUrl()}/api/diagrams/search?q=${encodeURIComponent(search)}`;
  } else if (folderId !== undefined) {
    url += `?folderId=${folderId === null ? "null" : folderId}`;
  }

  const res = await fetch(url, {
    headers: { cookie: cookieHeader },
    cache: "no-store",
  });
  if (!res.ok) return [];

  const payload = (await res.json()) as { diagrams?: Diagram[] } | Diagram[];
  if (Array.isArray(payload)) return payload;
  return payload.diagrams ?? [];
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ folderId?: string; q?: string }>;
}) {
  const params = await searchParams;
  const folders = await getFolders();

  const folderId = params.folderId === undefined
    ? undefined
    : params.folderId === "null"
      ? null
      : params.folderId;

  const diagrams = await getDiagrams(folderId, params.q);

  const currentFolder = folderId
    ? folders.find((f) => f.id === folderId)
    : null;

  const heading = params.q
    ? `Search: "${params.q}"`
    : currentFolder
      ? currentFolder.name
      : folderId === null
        ? "Unfiled"
        : "All Diagrams";

  return (
    <div className="flex gap-6">
      <DashboardSidebar
        folders={folders}
        activeFolderId={folderId}
        searchQuery={params.q}
      />

      <div className="flex-1 space-y-6">
        <div>
          <h1 className={ui.h1}>{heading}</h1>
          <p className={ui.subtitle}>
            {params.q
              ? `${diagrams.length} result${diagrams.length !== 1 ? "s" : ""}`
              : "Manage your boards and start a new one."}
          </p>
        </div>

        <div className={ui.card}>
          <DashboardActions currentFolderId={folderId ?? null} folders={folders} />

          {diagrams.length === 0 ? (
            <div className={ui.empty}>
              {params.q
                ? "No diagrams match your search."
                : "No diagrams here yet. Create your first one."}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {diagrams.map((diagram) => (
                <article
                  className="group overflow-hidden rounded-xl border border-border bg-surface"
                  key={diagram.id}
                >
                  <Link href={`/board/${diagram.id}`} className="block">
                    <div className="aspect-4/3 bg-gray-50">
                      {diagram.thumbnail ? (
                        <img
                          src={diagram.thumbnail}
                          alt={diagram.title || "Untitled"}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-text-secondary">
                          No preview
                        </div>
                      )}
                    </div>
                  </Link>
                  <div className="flex items-center justify-between p-3">
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-sm font-semibold text-text">
                        {diagram.title || "Untitled"}
                      </h2>
                      <p className="text-xs text-text-secondary">
                        {diagram.updatedAt ?? diagram.updated_at ?? "unknown"}
                      </p>
                    </div>
                    <div className="ml-2 flex shrink-0 items-center gap-1">
                      <MoveToMenuClient
                        diagramId={diagram.id}
                        folders={folders}
                        currentFolderId={diagram.folderId}
                      />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
