import { describe, it, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import { StructuredAuditLogger } from "../../../infrastructure/services/audit-logger";
import { logger } from "../../../infrastructure/logger";

afterEach(() => {
  mock.restoreAll();
});

describe("StructuredAuditLogger.log", () => {
  it("forwards the event to logger.info with audit:true marker and 'audit: <action>' message", () => {
    const infoMock = mock.method(logger, "info", () => {});
    const auditLogger = new StructuredAuditLogger();

    auditLogger.log({ actor: "user-1", action: "user.login" });

    assert.equal(infoMock.mock.calls.length, 1);
    const args = infoMock.mock.calls[0].arguments;
    assert.deepEqual(args[0], { audit: true, actor: "user-1", action: "user.login" });
    assert.equal(args[1], "audit: user.login");
  });

  it("preserves optional target and meta fields on the forwarded payload", () => {
    const infoMock = mock.method(logger, "info", () => {});
    const auditLogger = new StructuredAuditLogger();

    auditLogger.log({
      actor: "user-1",
      action: "diagram.update",
      target: "diagram-42",
      meta: { workspaceId: "ws-1", changedFields: ["title"] },
    });

    assert.equal(infoMock.mock.calls.length, 1);
    const payload = infoMock.mock.calls[0].arguments[0] as Record<string, unknown>;
    assert.equal(payload.audit, true);
    assert.equal(payload.actor, "user-1");
    assert.equal(payload.action, "diagram.update");
    assert.equal(payload.target, "diagram-42");
    assert.deepEqual(payload.meta, { workspaceId: "ws-1", changedFields: ["title"] });
    assert.equal(infoMock.mock.calls[0].arguments[1], "audit: diagram.update");
  });

  it("logs each event as a separate logger.info call", () => {
    const infoMock = mock.method(logger, "info", () => {});
    const auditLogger = new StructuredAuditLogger();

    auditLogger.log({ actor: "user-1", action: "a" });
    auditLogger.log({ actor: "user-2", action: "b" });
    auditLogger.log({ actor: "user-3", action: "c" });

    assert.equal(infoMock.mock.calls.length, 3);
    assert.equal(infoMock.mock.calls[0].arguments[1], "audit: a");
    assert.equal(infoMock.mock.calls[1].arguments[1], "audit: b");
    assert.equal(infoMock.mock.calls[2].arguments[1], "audit: c");
  });
});
