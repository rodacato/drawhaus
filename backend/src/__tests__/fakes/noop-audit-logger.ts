import type { AuditLogger, AuditEvent } from "../../domain/ports/audit-logger";

export class NoopAuditLogger implements AuditLogger {
  log(_event: AuditEvent): void {}
}
