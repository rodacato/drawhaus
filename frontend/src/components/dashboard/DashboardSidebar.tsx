import { Link, useNavigate } from "react-router-dom";
import type { Workspace } from "@/api/workspaces";
import { workspacesApi } from "@/api/workspaces";

type User = { name?: string; email?: string };

type DashboardSidebarProps = {
  user: User | null;
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  isRecent: boolean;
  isStarred: boolean;
  onNavRecent: () => void;
  onNavStarred: () => void;
  onSelectWorkspace: (id: string) => void;
  onWorkspaceCreated: (ws: Workspace) => void;
  onStatusMessage: (msg: string) => void;
  onLogout: () => Promise<void>;
};

const navBtnClass = (active: boolean) =>
  `flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition ${active ? "bg-primary/10 font-medium text-primary" : "text-text-secondary hover:bg-surface"}`;

export function DashboardSidebar({ user, workspaces, activeWorkspaceId, isRecent, isStarred, onNavRecent, onNavStarred, onSelectWorkspace, onWorkspaceCreated, onStatusMessage, onLogout }: DashboardSidebarProps) {
  const navigate = useNavigate();

  return (
    <aside className="flex w-72 shrink-0 flex-col justify-between border-r border-border bg-surface-raised">
      <div className="p-6">
        {/* Brand */}
        <Link to="/dashboard" className="mb-10 flex items-center gap-3">
          <img src="/logo-icon.svg" alt="" className="h-10 w-10 shrink-0" />
          <div>
            <h1 className="font-[family-name:var(--font-family-heading)] text-xl font-bold tracking-tight text-text-primary">Drawhaus</h1>
            <p className="text-xs text-text-muted">Diagram Workspace</p>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="space-y-1">
          <button onClick={onNavRecent} className={navBtnClass(isRecent)} type="button">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
            <span className="text-sm">Recent</span>
          </button>
          <button onClick={onNavStarred} className={navBtnClass(isStarred)} type="button">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
            <span className="text-sm">Starred</span>
          </button>

          {/* Workspaces section */}
          <div className="pb-2 pt-4 px-3 text-[10px] font-bold uppercase tracking-wider text-text-muted">Workspaces</div>
          {workspaces.map((ws) => (
            <div key={ws.id} className="group flex items-center">
              <button
                onClick={() => onSelectWorkspace(ws.id)}
                className={navBtnClass(activeWorkspaceId === ws.id && !isRecent && !isStarred)}
                type="button"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-xs" style={{ backgroundColor: ws.color + "22", color: ws.color }}>
                  {ws.icon || ws.name.charAt(0)}
                </span>
                <span className="truncate text-sm">{ws.isPersonal ? "Personal" : ws.name}</span>
              </button>
              {!ws.isPersonal && (
                <Link
                  to={`/workspace/${ws.id}/settings`}
                  className="hidden rounded px-1 text-text-muted hover:text-primary group-hover:block"
                  title="Workspace settings"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></svg>
                </Link>
              )}
            </div>
          ))}
          {workspaces.filter((w) => !w.isPersonal).length < 5 && (
            <button
              onClick={() => {
                workspacesApi.create({ name: "New Workspace" }).then((res) => {
                  onWorkspaceCreated(res.workspace);
                  onStatusMessage("Workspace created! You can rename it in workspace settings.");
                }).catch(() => { onStatusMessage("Could not create workspace."); });
              }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm italic text-text-muted transition hover:text-primary"
              type="button"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" /></svg>
              <span className="text-sm">New Workspace</span>
            </button>
          )}
        </nav>
      </div>

      {/* User profile */}
      {user && (
        <div className="border-t border-border p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold uppercase text-primary">
              {user.name?.charAt(0) || user.email?.charAt(0) || "?"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-text-primary">{user.name}</p>
              <p className="truncate text-xs text-text-muted">{user.email}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Link to="/settings" className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted transition hover:bg-surface hover:text-primary" title="Settings">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></svg>
              </Link>
              <button
                onClick={async () => { await onLogout(); navigate("/login"); }}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-error/70 transition hover:bg-error/10 hover:text-error"
                title="Log out"
                type="button"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
