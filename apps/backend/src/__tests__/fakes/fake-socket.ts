import type { Server, Socket } from "socket.io";

type Listener = (...args: unknown[]) => unknown;

export type Emitted = { event: string; payload: unknown };
export type Broadcast = Emitted & { room: string };

function recordInto(sink: Broadcast[], room: string) {
  return {
    emit: (event: string, payload?: unknown) => {
      sink.push({ room, event, payload });
      return true;
    },
  };
}

export class FakeSocket {
  readonly id: string;
  data: Record<string, unknown> = { roomRoles: {}, isGuest: false };
  rooms: Set<string>;
  handshake: { headers: Record<string, string | undefined> } = { headers: {} };
  emitted: Emitted[] = [];
  broadcasts: Broadcast[] = [];
  private readonly listeners = new Map<string, Listener>();

  constructor(id = "socket-1") {
    this.id = id;
    this.rooms = new Set([id]);
  }

  on(event: string, listener: Listener) {
    this.listeners.set(event, listener);
    return this;
  }

  emit(event: string, payload?: unknown) {
    this.emitted.push({ event, payload });
    return true;
  }

  join(room: string) {
    this.rooms.add(room);
  }

  to(room: string) {
    return recordInto(this.broadcasts, room);
  }

  get volatile() {
    return this;
  }

  events(): string[] {
    return [...this.listeners.keys()];
  }

  async receive(event: string, ...args: unknown[]): Promise<void> {
    const listener = this.listeners.get(event);
    if (!listener) throw new Error(`No listener registered for ${event}`);
    await listener(...args);
  }

  asSocket(): Socket {
    return this as unknown as Socket;
  }
}

export class FakeIo {
  broadcasts: Broadcast[] = [];
  failFetch = false;

  constructor(private readonly sockets: FakeSocket[] = []) {}

  in(room: string) {
    return {
      fetchSockets: async () => {
        if (this.failFetch) throw new Error("adapter timeout");
        return this.sockets.filter((s) => s.rooms.has(room));
      },
    };
  }

  to(room: string) {
    return recordInto(this.broadcasts, room);
  }

  asServer(): Server {
    return this as unknown as Server;
  }
}
