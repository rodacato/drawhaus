import { io, type Socket } from "socket.io-client";

export function createSocket(): Socket {
  return io(process.env.NEXT_PUBLIC_WS_URL ?? window.location.origin, {
    path: "/socket.io",
    transports: ["websocket", "polling"],
    withCredentials: true,
  });
}
