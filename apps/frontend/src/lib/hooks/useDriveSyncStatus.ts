import { useEffect, useState } from "react";
import type { Socket } from "socket.io-client";
import type { DriveSyncState } from "@/components/DriveSyncBadge";

export function useDriveSyncStatus(socketRef: React.MutableRefObject<Socket | null>) {
  const [driveSyncState, setDriveSyncState] = useState<DriveSyncState>("idle");
  const [driveSyncError, setDriveSyncError] = useState<string | null>(null);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;
    const handler = ({ synced, error }: { synced: boolean; error?: string }) => {
      if (synced) {
        setDriveSyncState("synced");
        setDriveSyncError(null);
        const timer = setTimeout(() => setDriveSyncState("idle"), 5000);
        return () => clearTimeout(timer);
      }
      if (error) {
        setDriveSyncState("error");
        setDriveSyncError(error);
        const timer = setTimeout(() => setDriveSyncState("idle"), 8000);
        return () => clearTimeout(timer);
      }
    };
    socket.on("drive-sync-status", handler);
    return () => { socket.off("drive-sync-status", handler); };
  }, [socketRef]);

  return { driveSyncState, driveSyncError };
}
