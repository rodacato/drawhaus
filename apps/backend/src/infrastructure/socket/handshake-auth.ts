import type { ExtendedError, Socket } from "socket.io";
import { parse } from "cookie";
import { z } from "zod";
import type {
  AuthenticateSocketUseCase,
  SocketCredentials,
} from "../../application/use-cases/realtime/authenticate-socket";
import { config } from "../config";
import { logger } from "../logger";

export type HandshakeRejection = "unauthenticated" | "server-error";

const handshakeAuthSchema = z.object({ shareToken: z.string().min(1).max(512) });

function credentialsOf(handshake: Socket["handshake"]): SocketCredentials {
  const cookieHeader = handshake.headers.cookie;
  const parsed = handshakeAuthSchema.safeParse(handshake.auth);
  return {
    sessionToken: cookieHeader ? (parse(cookieHeader)[config.cookieName] ?? null) : null,
    shareToken: parsed.success ? parsed.data.shareToken : null,
  };
}

// Old clients show this message verbatim in their connection badge, so it tells a person what to do.
function rejection(reason: HandshakeRejection): ExtendedError {
  const error: ExtendedError = new Error("Not authorized to connect. Reload the page.");
  error.data = { reason };
  return error;
}

export function handshakeAuth(authenticate: AuthenticateSocketUseCase) {
  return async (socket: Socket, next: (err?: ExtendedError) => void): Promise<void> => {
    try {
      const admission = await authenticate.execute(credentialsOf(socket.handshake));
      next(admission ? undefined : rejection("unauthenticated"));
    } catch (error: unknown) {
      logger.error({ err: error, socketId: socket.id }, "socket handshake auth failed");
      next(rejection("server-error"));
    }
  };
}
