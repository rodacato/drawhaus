import cron, { type ScheduledTask } from "node-cron";
import type { WebhookDeliveryService } from "./webhook-delivery-service";
import { logger } from "../logger";

/** Six fields: the backoff is measured in seconds, so a minute-resolution poll would blur it. */
const SCHEDULE = "*/10 * * * * *";

let task: ScheduledTask | null = null;
let draining = false;

export function startWebhookScheduler(service: WebhookDeliveryService): void {
  stopWebhookScheduler();

  task = cron.schedule(SCHEDULE, async () => {
    if (draining) return;
    draining = true;
    try {
      await service.drain();
    } catch (err) {
      logger.error(err, "Webhook delivery poll failed");
    } finally {
      draining = false;
    }
  });

  logger.info({ schedule: SCHEDULE }, "Webhook delivery scheduler started");
}

export function stopWebhookScheduler(): void {
  if (task) {
    // destroy(), not stop(): v4 keeps stopped tasks in its registry, so every restart would leak one.
    void task.destroy();
    task = null;
  }
  draining = false;
}
