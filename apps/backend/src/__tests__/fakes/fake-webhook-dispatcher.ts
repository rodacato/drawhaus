import type { WebhookDispatcher, WebhookEmission } from "../../domain/ports/webhook-dispatcher";

export class FakeWebhookDispatcher implements WebhookDispatcher {
  readonly emissions: WebhookEmission[] = [];

  dispatch(emission: WebhookEmission): void {
    this.emissions.push(emission);
  }

  events(): string[] {
    return this.emissions.map((e) => e.event);
  }
}
