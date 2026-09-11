import type { Page } from "@playwright/test";

const EDIT_EVENTS = ["scene-delta", "scene-update", "save-scene"];

// socket.io-msgpack-parser encodes the event name as a msgpack fixstr: a length byte, then the bytes.
export function hasEvent(frame: string | Buffer, event: string) {
  const bytes = typeof frame === "string" ? Buffer.from(frame) : frame;
  return bytes.includes(Buffer.concat([Buffer.from([0xa0 | event.length]), Buffer.from(event)]));
}

export function isEditFrame(frame: string | Buffer) {
  return EDIT_EVENTS.some((event) => hasEvent(frame, event));
}

export class SocketTraffic {
  private readonly sent: (string | Buffer)[] = [];
  private readonly received: (string | Buffer)[] = [];

  constructor(page: Page) {
    page.on("websocket", (ws) => {
      if (!ws.url().includes("/socket.io/")) return;
      ws.on("framesent", ({ payload }) => this.sent.push(payload));
      ws.on("framereceived", ({ payload }) => this.received.push(payload));
    });
  }

  sentEdits() {
    return this.sent.filter(isEditFrame).length;
  }

  receivedCount(event: string) {
    return this.received.filter((frame) => hasEvent(frame, event)).length;
  }
}
