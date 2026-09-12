import { io, type Socket } from "socket.io-client";
import msgpackParser from "socket.io-msgpack-parser";

export type HandshakeAuth = { shareToken: string };

export function createSocket(auth?: HandshakeAuth): Socket {
  return io(import.meta.env.VITE_WS_URL || globalThis.location.origin, {
    path: "/socket.io",
    parser: msgpackParser,
    transports: ["websocket", "polling"],
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 500,
    reconnectionDelayMax: 5000,
    ...(auth ? { auth } : {}),
  });
}
