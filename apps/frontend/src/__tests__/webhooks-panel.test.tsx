import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { toastFn, confirmFn } = vi.hoisted(() => ({ toastFn: vi.fn(), confirmFn: vi.fn() }));

vi.mock("@/components/Toast", () => ({ useToast: () => toastFn }));
vi.mock("@/components/ConfirmDialog", () => ({ useConfirm: () => confirmFn }));

vi.mock("@/api/admin", () => ({
  adminApi: {
    listWebhooks: vi.fn(),
    createWebhook: vi.fn(),
    updateWebhook: vi.fn(),
    deleteWebhook: vi.fn(),
    regenerateWebhookSecret: vi.fn(),
    listWebhookDeliveries: vi.fn(),
    testWebhook: vi.fn(),
  },
}));

import { adminApi } from "@/api/admin";
import type { AdminWebhook, AdminWebhookDelivery } from "@/api/admin";
import { WebhooksPanel } from "@/components/WebhooksPanel";

const EVENTS = [
  "diagram.created",
  "diagram.updated",
  "diagram.deleted",
  "diagram.shared",
  "template.created",
];

const SECRET = "whsec_" + "a".repeat(64);

const webhook: AdminWebhook = {
  id: "wh-1",
  url: "https://example.com/hooks/drawhaus",
  description: "Rebuild docs in CI",
  events: ["diagram.created", "diagram.updated"],
  active: true,
  createdAt: "2026-09-01T10:00:00.000Z",
  updatedAt: "2026-09-01T10:00:00.000Z",
};

const failedDelivery: AdminWebhookDelivery = {
  id: "del-1",
  eventId: "evt-1",
  eventType: "diagram.updated",
  status: "failed",
  attempts: 3,
  lastError: "HTTP 503 from receiver",
  nextAttemptAt: "2026-09-01T10:05:00.000Z",
  deliveredAt: null,
  createdAt: "2026-09-01T10:00:00.000Z",
};

function mockList(webhooks: AdminWebhook[], encryptionEnabled = true) {
  vi.mocked(adminApi.listWebhooks).mockResolvedValue({
    webhooks,
    events: EVENTS,
    encryptionEnabled,
  });
}

async function renderLoaded() {
  render(<WebhooksPanel />);
  await waitFor(() => expect(screen.queryByText(/Loading webhooks/i)).toBeNull());
}

describe("WebhooksPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    confirmFn.mockResolvedValue(true);
  });

  test("renders the registered webhooks with their events and state", async () => {
    mockList([webhook]);
    await renderLoaded();

    expect(screen.getByText("https://example.com/hooks/drawhaus")).toBeTruthy();
    expect(screen.getByText("Rebuild docs in CI")).toBeTruthy();
    expect(screen.getAllByText("diagram.created").length).toBeGreaterThan(0);
    expect(screen.getByText("Active")).toBeTruthy();
  });

  test("renders the empty state and every selectable event", async () => {
    mockList([]);
    await renderLoaded();

    expect(screen.getByText("No webhooks registered.")).toBeTruthy();
    for (const event of EVENTS) expect(screen.getAllByText(event).length).toBeGreaterThan(0);
  });

  test("shows the degraded state when webhooks are unavailable", async () => {
    mockList([], false);
    await renderLoaded();

    expect(screen.getAllByText(/ENCRYPTION_KEY/).length).toBeGreaterThan(0);
    expect(screen.getByText(/webhooks are unavailable/i)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Add Webhook" })).toBeNull();
  });

  test("a failed list request leaves the degraded state rather than an empty panel", async () => {
    vi.mocked(adminApi.listWebhooks).mockRejectedValue(new Error("boom"));
    await act(async () => {
      render(<WebhooksPanel />);
    });
    await waitFor(() => expect(screen.queryByText(/Loading webhooks/i)).toBeNull());

    expect(screen.getAllByText(/ENCRYPTION_KEY/).length).toBeGreaterThan(0);
  });

  test("Add Webhook stays disabled until a URL and at least one event are chosen", async () => {
    mockList([]);
    const user = userEvent.setup();
    await renderLoaded();

    const submit = screen.getByRole("button", { name: "Add Webhook" }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);

    await user.type(screen.getByPlaceholderText(/example.com\/hooks/i), "https://a.test/hook");
    expect(submit.disabled).toBe(true);

    await user.click(screen.getByLabelText("diagram.created"));
    expect(submit.disabled).toBe(false);
  });

  test("creating a webhook shows the secret once with a copy-it-now warning", async () => {
    mockList([]);
    vi.mocked(adminApi.createWebhook).mockResolvedValue({ webhook, secret: SECRET });
    const user = userEvent.setup();
    await renderLoaded();

    await user.type(screen.getByPlaceholderText(/example.com\/hooks/i), "https://a.test/hook");
    await user.type(screen.getByPlaceholderText(/Rebuild docs/i), "CI");
    await user.click(screen.getByLabelText("diagram.created"));
    await user.click(screen.getByRole("button", { name: "Add Webhook" }));

    await waitFor(() =>
      expect(adminApi.createWebhook).toHaveBeenCalledWith({
        url: "https://a.test/hook",
        description: "CI",
        events: ["diagram.created"],
      }),
    );
    expect(screen.getByText(SECRET)).toBeTruthy();
    expect(screen.getByText(/it won't be shown again/i)).toBeTruthy();
  });

  test("the secret is gone once dismissed and never re-fetched", async () => {
    mockList([]);
    vi.mocked(adminApi.createWebhook).mockResolvedValue({ webhook, secret: SECRET });
    const user = userEvent.setup();
    await renderLoaded();

    await user.type(screen.getByPlaceholderText(/example.com\/hooks/i), "https://a.test/hook");
    await user.click(screen.getByLabelText("diagram.created"));
    await user.click(screen.getByRole("button", { name: "Add Webhook" }));
    await waitFor(() => expect(screen.getByText(SECRET)).toBeTruthy());

    await user.click(screen.getByRole("button", { name: "Dismiss" }));

    expect(screen.queryByText(SECRET)).toBeNull();
    expect(screen.queryByText(/it won't be shown again/i)).toBeNull();
  });

  test("a rejected creation surfaces the server's reason", async () => {
    mockList([]);
    vi.mocked(adminApi.createWebhook).mockRejectedValue({
      response: { data: { error: "Webhook URL must use http or https" } },
    });
    const user = userEvent.setup();
    await renderLoaded();

    await user.type(screen.getByPlaceholderText(/example.com\/hooks/i), "ftp://a.test/hook");
    await user.click(screen.getByLabelText("diagram.created"));
    await user.click(screen.getByRole("button", { name: "Add Webhook" }));

    await waitFor(() =>
      expect(screen.getByText("Webhook URL must use http or https")).toBeTruthy(),
    );
    expect(screen.queryByText(SECRET)).toBeNull();
  });

  test("the delivery view renders a failed delivery's error and attempts", async () => {
    mockList([webhook]);
    vi.mocked(adminApi.listWebhookDeliveries).mockResolvedValue({ deliveries: [failedDelivery] });
    const user = userEvent.setup();
    await renderLoaded();

    await user.click(screen.getByRole("button", { name: "Deliveries" }));

    await waitFor(() => expect(screen.getByText("HTTP 503 from receiver")).toBeTruthy());
    expect(screen.getByText("failed")).toBeTruthy();
    expect(screen.getByText("3 attempts")).toBeTruthy();
    expect(adminApi.listWebhookDeliveries).toHaveBeenCalledWith("wh-1");
  });

  test("the delivery view reports an empty log rather than nothing", async () => {
    mockList([webhook]);
    vi.mocked(adminApi.listWebhookDeliveries).mockResolvedValue({ deliveries: [] });
    const user = userEvent.setup();
    await renderLoaded();

    await user.click(screen.getByRole("button", { name: "Deliveries" }));

    await waitFor(() => expect(screen.getByText("No deliveries yet.")).toBeTruthy());
  });

  test("toggling active patches the webhook and reloads", async () => {
    mockList([webhook]);
    vi.mocked(adminApi.updateWebhook).mockResolvedValue({ webhook: { ...webhook, active: false } });
    const user = userEvent.setup();
    await renderLoaded();

    const row = screen.getByText(webhook.url).closest("div.rounded-lg") as HTMLElement;
    const toggle = within(row).getAllByRole("button")[0];
    await user.click(toggle);

    await waitFor(() =>
      expect(adminApi.updateWebhook).toHaveBeenCalledWith("wh-1", { active: false }),
    );
    expect(adminApi.listWebhooks).toHaveBeenCalledTimes(2);
  });

  test("deleting asks for confirmation first", async () => {
    mockList([webhook]);
    confirmFn.mockResolvedValue(false);
    const user = userEvent.setup();
    await renderLoaded();

    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(confirmFn).toHaveBeenCalled();
    expect(adminApi.deleteWebhook).not.toHaveBeenCalled();
  });

  test("deleting proceeds once confirmed", async () => {
    mockList([webhook]);
    vi.mocked(adminApi.deleteWebhook).mockResolvedValue(undefined as never);
    const user = userEvent.setup();
    await renderLoaded();

    await user.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(adminApi.deleteWebhook).toHaveBeenCalledWith("wh-1"));
    expect(toastFn).toHaveBeenCalledWith("Webhook deleted", "success");
  });

  test("regenerating reveals the new secret once", async () => {
    mockList([webhook]);
    const nextSecret = "whsec_" + "b".repeat(64);
    vi.mocked(adminApi.regenerateWebhookSecret).mockResolvedValue({ webhook, secret: nextSecret });
    const user = userEvent.setup();
    await renderLoaded();

    await user.click(screen.getByRole("button", { name: "Regenerate secret" }));

    await waitFor(() => expect(screen.getByText(nextSecret)).toBeTruthy());
    expect(screen.getByText(/it won't be shown again/i)).toBeTruthy();
  });

  test("a test event reports the receiver's answer in both directions", async () => {
    mockList([webhook]);
    vi.mocked(adminApi.testWebhook).mockResolvedValue({ result: { ok: true, status: 204 } });
    const user = userEvent.setup();
    await renderLoaded();

    await user.click(screen.getByRole("button", { name: "Send test event" }));
    await waitFor(() =>
      expect(toastFn).toHaveBeenCalledWith("Test event delivered (HTTP 204)", "success"),
    );

    vi.mocked(adminApi.testWebhook).mockResolvedValue({
      result: { ok: false, error: "connect ECONNREFUSED" },
    });
    await user.click(screen.getByRole("button", { name: "Send test event" }));
    await waitFor(() =>
      expect(toastFn).toHaveBeenCalledWith("Test event failed: connect ECONNREFUSED", "error"),
    );
  });
});
