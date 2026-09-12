import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { createServer, type IncomingHttpHeaders, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { WebhookDeliveryService } from "../../../infrastructure/services/webhook-delivery-service";
import { FetchWebhookSender } from "../../../infrastructure/services/webhook-sender";
import { InMemoryWebhookRepository } from "../../fakes/in-memory-webhook-repository";
import { OutboxWebhookDispatcher } from "../../../infrastructure/services/webhook-dispatcher";

type Received = { headers: IncomingHttpHeaders; body: string };

type Receiver = {
  url: string;
  received: Received[];
  close: () => Promise<void>;
};

type Responder = (received: Received) => { status: number; headers?: Record<string, string> };

async function startReceiver(respond: Responder = () => ({ status: 200 })): Promise<Receiver> {
  const received: Received[] = [];
  const server: Server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      const entry = { headers: req.headers, body: Buffer.concat(chunks).toString("utf8") };
      received.push(entry);
      const answer = respond(entry);
      res.writeHead(answer.status, answer.headers);
      res.end();
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}/hook`,
    received,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

/** What a third party implements: recompute the HMAC over `${t}.${rawBody}` and compare. */
function receiverAccepts(entry: Received, secret: string): boolean {
  const header = entry.headers["x-drawhaus-signature"];
  if (typeof header !== "string") return false;
  const timestamp = /t=(\d+)/.exec(header)?.[1];
  const signature = /v1=([0-9a-f]+)/.exec(header)?.[1];
  if (!timestamp || !signature) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${entry.body}`).digest("hex");
  return expected === signature;
}

const SECRET = "whsec_test_secret";

async function seed(repo: InMemoryWebhookRepository, url: string) {
  const webhook = await repo.create({
    url,
    secret: SECRET,
    events: ["diagram.created"],
  });
  await new OutboxWebhookDispatcher(repo).enqueue({
    event: "diagram.created",
    actorId: "user-1",
    data: { id: "diagram-1", title: "Board" },
  });
  return webhook;
}

describe("webhook delivery against a real receiver", () => {
  it("signs the body so the receiver can verify it, and marks the delivery delivered", async () => {
    const repo = new InMemoryWebhookRepository();
    const receiver = await startReceiver((entry) => ({
      status: receiverAccepts(entry, SECRET) ? 200 : 401,
    }));
    try {
      await seed(repo, receiver.url);
      await new WebhookDeliveryService(repo, new FetchWebhookSender()).drain();

      assert.equal(receiver.received.length, 1);
      const entry = receiver.received[0];
      assert.ok(receiverAccepts(entry, SECRET), "receiver could not verify the signature");
      assert.equal(entry.headers["x-drawhaus-event"], "diagram.created");
      assert.equal(entry.headers["content-type"], "application/json");

      const payload = JSON.parse(entry.body) as {
        id: string;
        event: string;
        data: { id: string };
      };
      assert.equal(payload.event, "diagram.created");
      assert.equal(payload.data.id, "diagram-1");
      assert.equal(entry.headers["x-drawhaus-event-id"], payload.id);
      assert.equal(entry.headers["x-drawhaus-delivery"], repo.deliveries[0].id);

      assert.equal(repo.deliveries[0].status, "delivered");
      assert.ok(repo.deliveries[0].deliveredAt);
    } finally {
      await receiver.close();
    }
  });

  it("a receiver holding a different secret rejects the signature", async () => {
    const repo = new InMemoryWebhookRepository();
    const receiver = await startReceiver((entry) => ({
      status: receiverAccepts(entry, "another-secret") ? 200 : 401,
    }));
    try {
      await seed(repo, receiver.url);
      await new WebhookDeliveryService(repo, new FetchWebhookSender()).drain();

      assert.equal(repo.deliveries[0].status, "pending");
      assert.equal(repo.deliveries[0].lastError, "HTTP 401");
    } finally {
      await receiver.close();
    }
  });

  it("retries with exponential backoff and dead-letters after the third attempt", async () => {
    const repo = new InMemoryWebhookRepository();
    const receiver = await startReceiver(() => ({ status: 500 }));
    try {
      await seed(repo, receiver.url);
      const service = new WebhookDeliveryService(repo, new FetchWebhookSender());
      const delivery = repo.deliveries[0];

      await service.drain();
      assert.equal(delivery.status, "pending");
      assert.equal(delivery.attempts, 1);
      assert.equal(delivery.lastError, "HTTP 500");
      assert.equal(Math.round((delivery.nextAttemptAt.getTime() - Date.now()) / 1000), 30);

      delivery.nextAttemptAt = new Date(0);
      await service.drain();
      assert.equal(delivery.status, "pending");
      assert.equal(delivery.attempts, 2);
      assert.equal(Math.round((delivery.nextAttemptAt.getTime() - Date.now()) / 1000), 120);

      delivery.nextAttemptAt = new Date(0);
      await service.drain();
      assert.equal(delivery.status, "failed");
      assert.equal(delivery.attempts, 3);
      assert.equal(delivery.lastError, "HTTP 500");
      assert.equal(receiver.received.length, 3);

      assert.equal(await service.drain(), 0, "a dead-lettered delivery must not be claimed again");
    } finally {
      await receiver.close();
    }
  });

  it("does not claim a delivery whose backoff has not elapsed", async () => {
    const repo = new InMemoryWebhookRepository();
    const receiver = await startReceiver(() => ({ status: 500 }));
    try {
      await seed(repo, receiver.url);
      const service = new WebhookDeliveryService(repo, new FetchWebhookSender());

      await service.drain();
      assert.equal(await service.drain(), 0);
      assert.equal(receiver.received.length, 1);
    } finally {
      await receiver.close();
    }
  });

  it("does not follow a redirect to another host", async () => {
    const repo = new InMemoryWebhookRepository();
    const internal = await startReceiver(() => ({ status: 200 }));
    const redirector = await startReceiver(() => ({
      status: 302,
      headers: { location: internal.url },
    }));
    try {
      await seed(repo, redirector.url);
      await new WebhookDeliveryService(repo, new FetchWebhookSender()).drain();

      assert.equal(internal.received.length, 0, "the redirect target must never be contacted");
      assert.equal(repo.deliveries[0].status, "pending");
      assert.notEqual(repo.deliveries[0].lastError, null);
    } finally {
      await redirector.close();
      await internal.close();
    }
  });

  it("gives up on a receiver that never answers", async () => {
    const repo = new InMemoryWebhookRepository();
    const server = createServer(() => {
      // Deliberately never answers, so the sender's own timeout is what ends the request.
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address() as AddressInfo;
    try {
      await seed(repo, `http://127.0.0.1:${port}/hook`);
      await new WebhookDeliveryService(repo, new FetchWebhookSender(100)).drain();

      assert.equal(repo.deliveries[0].status, "pending");
      assert.equal(repo.deliveries[0].attempts, 1);
      assert.notEqual(repo.deliveries[0].lastError, null);
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it("refuses a non-http scheme instead of sending", async () => {
    const repo = new InMemoryWebhookRepository();
    await seed(repo, "file:///etc/passwd");

    await new WebhookDeliveryService(repo, new FetchWebhookSender()).drain();

    assert.equal(repo.deliveries[0].lastError, "Rejected URL (protocol)");
  });

  it("dead-letters a delivery whose webhook was deleted", async () => {
    const repo = new InMemoryWebhookRepository();
    const receiver = await startReceiver();
    try {
      const webhook = await seed(repo, receiver.url);
      await repo.delete(webhook.id);

      await new WebhookDeliveryService(repo, new FetchWebhookSender()).drain();

      assert.equal(repo.deliveries[0].status, "failed");
      assert.equal(receiver.received.length, 0);
    } finally {
      await receiver.close();
    }
  });
});
