import { test, expect } from "../../fixtures/test";

type Webhook = {
  id: string;
  url: string;
  description: string;
  events: string[];
  active: boolean;
};

const SECRET_KEYS = ["secret", "encryptedSecret", "encrypted_secret", "secretIv", "secretAuthTag"];

test.describe("Admin Webhooks API", () => {
  test("a registered webhook returns its secret once and never again", async ({ adminApi }) => {
    const created = await adminApi.post("/api/admin/webhooks", {
      data: {
        url: "http://127.0.0.1:9/never-called",
        description: "E2E registered webhook",
        events: ["diagram.created"],
      },
    });
    expect(created.status()).toBe(201);
    const body = (await created.json()) as { webhook: Webhook; secret: string };
    expect(body.secret).toMatch(/^whsec_[0-9a-f]{64}$/);

    const list = await adminApi.get("/api/admin/webhooks");
    expect(list.ok()).toBeTruthy();
    const raw = await list.text();
    expect(raw).not.toContain(body.secret);
    const { webhooks, encryptionEnabled } = JSON.parse(raw) as {
      webhooks: Webhook[];
      encryptionEnabled: boolean;
    };
    expect(encryptionEnabled).toBe(true);
    const mine = webhooks.find((w) => w.id === body.webhook.id);
    expect(mine?.description).toBe("E2E registered webhook");
    for (const key of SECRET_KEYS) expect(Object.keys(mine ?? {})).not.toContain(key);

    await adminApi.delete(`/api/admin/webhooks/${body.webhook.id}`);
  });

  test("regenerating rotates the secret to a different value", async ({ adminApi }) => {
    const created = await adminApi.post("/api/admin/webhooks", {
      data: { url: "https://example.test/hook", events: ["template.created"] },
    });
    const { webhook, secret } = (await created.json()) as { webhook: Webhook; secret: string };

    const rotated = await adminApi.post(`/api/admin/webhooks/${webhook.id}/secret`);
    expect(rotated.ok()).toBeTruthy();
    const next = (await rotated.json()) as { secret: string };
    expect(next.secret).toMatch(/^whsec_[0-9a-f]{64}$/);
    expect(next.secret).not.toBe(secret);

    await adminApi.delete(`/api/admin/webhooks/${webhook.id}`);
  });

  test("a URL the policy refuses is rejected", async ({ adminApi }) => {
    const res = await adminApi.post("/api/admin/webhooks", {
      data: { url: "file:///etc/passwd", events: ["diagram.created"] },
    });
    expect(res.status()).toBe(400);
  });

  test("a non-admin cannot read or register webhooks", async ({ request }) => {
    expect((await request.get("/api/admin/webhooks")).status()).toBe(403);
    const res = await request.post("/api/admin/webhooks", {
      data: { url: "https://example.test/hook", events: ["diagram.created"] },
    });
    expect(res.status()).toBe(403);
  });
});
