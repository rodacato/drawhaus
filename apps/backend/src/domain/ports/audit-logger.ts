export interface AuditEvent {
  actor: string;
  action: string;
  target?: string;
  meta?: Record<string, unknown>;
}

export interface AuditLogger {
  log(event: AuditEvent): void;
}
