import type {
  DeliveryDraft,
  WebhookDraft,
  WebhookPatch,
  WebhookRepository,
} from "../../domain/ports/webhook-repository";
import type {
  Webhook,
  WebhookDelivery,
  WebhookDeliveryStatus,
  WebhookEvent,
  WebhookPayload,
} from "../../domain/entities/webhook";
import { isWebhookEvent } from "../../domain/entities/webhook";
import { decrypt, encrypt } from "../services/encryption";
import { pool } from "../db";

type WebhookRow = {
  id: string;
  url: string;
  description: string;
  events: string[];
  active: boolean;
  created_at: string;
  updated_at: string;
};

type DeliveryRow = {
  id: string;
  webhook_id: string;
  event_id: string;
  event_type: string;
  payload: WebhookPayload;
  status: string;
  attempts: number;
  next_attempt_at: string;
  last_error: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
};

const WEBHOOK_COLS = "id, url, description, events, active, created_at, updated_at";
const DELIVERY_COLS =
  "id, webhook_id, event_id, event_type, payload, status, attempts, next_attempt_at, last_error, delivered_at, created_at, updated_at";
const DELIVERY_COLS_ALIASED = DELIVERY_COLS.split(", ")
  .map((column) => `d.${column}`)
  .join(", ");

function toWebhook(row: WebhookRow): Webhook {
  return {
    id: row.id,
    url: row.url,
    description: row.description,
    events: row.events.filter(isWebhookEvent),
    active: row.active,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function toDelivery(row: DeliveryRow): WebhookDelivery {
  return {
    id: row.id,
    webhookId: row.webhook_id,
    eventId: row.event_id,
    eventType: row.event_type as WebhookEvent,
    payload: row.payload,
    status: row.status as WebhookDeliveryStatus,
    attempts: row.attempts,
    nextAttemptAt: new Date(row.next_attempt_at),
    lastError: row.last_error,
    deliveredAt: row.delivered_at ? new Date(row.delivered_at) : null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export class PgWebhookRepository implements WebhookRepository {
  constructor(private readonly encryptionKey: string) {}

  async create(draft: WebhookDraft): Promise<Webhook> {
    const secret = encrypt(draft.secret, this.encryptionKey);
    const { rows } = await pool.query<WebhookRow>(
      `INSERT INTO webhooks (url, description, events, active, encrypted_secret, secret_iv, secret_auth_tag)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING ${WEBHOOK_COLS}`,
      [
        draft.url,
        draft.description ?? "",
        draft.events,
        draft.active ?? true,
        secret.encrypted,
        secret.iv,
        secret.authTag,
      ],
    );
    return toWebhook(rows[0]);
  }

  async findById(id: string): Promise<Webhook | null> {
    const { rows } = await pool.query<WebhookRow>(
      `SELECT ${WEBHOOK_COLS} FROM webhooks WHERE id = $1`,
      [id],
    );
    return rows[0] ? toWebhook(rows[0]) : null;
  }

  async list(): Promise<Webhook[]> {
    const { rows } = await pool.query<WebhookRow>(
      `SELECT ${WEBHOOK_COLS} FROM webhooks ORDER BY created_at DESC`,
    );
    return rows.map(toWebhook);
  }

  async update(id: string, patch: WebhookPatch): Promise<Webhook | null> {
    const sets: string[] = [];
    const params: unknown[] = [id];
    const set = (column: string, value: unknown) => {
      params.push(value);
      sets.push(`${column} = $${params.length}`);
    };

    if (patch.url !== undefined) set("url", patch.url);
    if (patch.description !== undefined) set("description", patch.description);
    if (patch.events !== undefined) set("events", patch.events);
    if (patch.active !== undefined) set("active", patch.active);
    if (patch.secret !== undefined) {
      const secret = encrypt(patch.secret, this.encryptionKey);
      set("encrypted_secret", secret.encrypted);
      set("secret_iv", secret.iv);
      set("secret_auth_tag", secret.authTag);
    }
    if (sets.length === 0) return this.findById(id);

    const { rows } = await pool.query<WebhookRow>(
      `UPDATE webhooks SET ${sets.join(", ")}, updated_at = now() WHERE id = $1
       RETURNING ${WEBHOOK_COLS}`,
      params,
    );
    return rows[0] ? toWebhook(rows[0]) : null;
  }

  async delete(id: string): Promise<void> {
    await pool.query("DELETE FROM webhooks WHERE id = $1", [id]);
  }

  async findActiveForEvent(event: WebhookEvent): Promise<Webhook[]> {
    const { rows } = await pool.query<WebhookRow>(
      `SELECT ${WEBHOOK_COLS} FROM webhooks WHERE active AND $1 = ANY(events) ORDER BY created_at`,
      [event],
    );
    return rows.map(toWebhook);
  }

  async findSecret(id: string): Promise<string | null> {
    const { rows } = await pool.query<{
      encrypted_secret: string;
      secret_iv: string;
      secret_auth_tag: string;
    }>("SELECT encrypted_secret, secret_iv, secret_auth_tag FROM webhooks WHERE id = $1", [id]);
    if (rows.length === 0) return null;
    return decrypt(
      {
        encrypted: rows[0].encrypted_secret,
        iv: rows[0].secret_iv,
        authTag: rows[0].secret_auth_tag,
      },
      this.encryptionKey,
    );
  }

  async enqueue(drafts: DeliveryDraft[]): Promise<void> {
    if (drafts.length === 0) return;
    const params: unknown[] = [];
    const tuples = drafts.map((draft) => {
      params.push(draft.webhookId, draft.eventId, draft.eventType, JSON.stringify(draft.payload));
      const base = params.length - 4;
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`;
    });
    await pool.query(
      `INSERT INTO webhook_deliveries (webhook_id, event_id, event_type, payload)
       VALUES ${tuples.join(", ")}`,
      params,
    );
  }

  async claimDue(limit: number, leaseMs: number): Promise<WebhookDelivery[]> {
    const { rows } = await pool.query<DeliveryRow>(
      `UPDATE webhook_deliveries d
          SET attempts = d.attempts + 1,
              next_attempt_at = now() + make_interval(secs => $2),
              updated_at = now()
         FROM (
           SELECT id FROM webhook_deliveries
            WHERE status = 'pending' AND next_attempt_at <= now()
            ORDER BY next_attempt_at
              FOR UPDATE SKIP LOCKED
            LIMIT $1
         ) due
        WHERE d.id = due.id
       RETURNING ${DELIVERY_COLS_ALIASED}`,
      [limit, leaseMs / 1000],
    );
    return rows.map(toDelivery);
  }

  async markDelivered(id: string): Promise<void> {
    await pool.query(
      `UPDATE webhook_deliveries
          SET status = 'delivered', delivered_at = now(), last_error = NULL, updated_at = now()
        WHERE id = $1`,
      [id],
    );
  }

  async markRetry(id: string, nextAttemptAt: Date, error: string): Promise<void> {
    await pool.query(
      `UPDATE webhook_deliveries
          SET status = 'pending', next_attempt_at = $2, last_error = $3, updated_at = now()
        WHERE id = $1`,
      [id, nextAttemptAt, error],
    );
  }

  async markFailed(id: string, error: string): Promise<void> {
    await pool.query(
      `UPDATE webhook_deliveries
          SET status = 'failed', last_error = $2, updated_at = now()
        WHERE id = $1`,
      [id, error],
    );
  }

  async listDeliveries(webhookId: string, limit: number): Promise<WebhookDelivery[]> {
    const { rows } = await pool.query<DeliveryRow>(
      `SELECT ${DELIVERY_COLS} FROM webhook_deliveries
        WHERE webhook_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [webhookId, limit],
    );
    return rows.map(toDelivery);
  }
}
