import { logger } from "../logger";
import type { AuditLogger, AuditEvent } from "../../domain/ports/audit-logger";

export class StructuredAuditLogger implements AuditLogger {
  log(event: AuditEvent): void {
    logger.info({ audit: true, ...event }, `audit: ${event.action}`);
  }
}
