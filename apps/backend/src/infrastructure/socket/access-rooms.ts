import { createHash } from "node:crypto";
import type { AccessRevoked } from "../../domain/ports/realtime-notifier";
import type { SocketAdmission } from "../../application/use-cases/realtime/authenticate-socket";

// The Redis adapter sends room names to Redis, so a token is never one.
function digest(token: string): string {
  return createHash("sha256").update(token).digest("base64url");
}

export function accessRoom(credential: AccessRevoked): string {
  switch (credential.kind) {
    case "session":
      return `access:session:${digest(credential.sessionToken)}`;
    case "user-sessions":
      return `access:user:${credential.userId}`;
    case "share-link":
      return `access:share-link:${digest(credential.shareToken)}`;
  }
}

export function admissionRooms(admission: SocketAdmission): string[] {
  if (admission.via === "share-link") {
    return [accessRoom({ kind: "share-link", shareToken: admission.shareToken })];
  }
  return [
    accessRoom({ kind: "session", sessionToken: admission.sessionToken }),
    accessRoom({ kind: "user-sessions", userId: admission.userId }),
  ];
}
