import { io, type Socket } from "socket.io-client";
import msgpackParser from "socket.io-msgpack-parser";

export function createSocket(): Socket {
  return io(import.meta.env.VITE_WS_URL || window.location.origin, {
    path: "/socket.io",
    parser: msgpackParser,
    transports: ["websocket", "polling"],
    withCredentials: true,
  });
}
