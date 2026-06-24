import { describe, it, beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import cron from "node-cron";
import { startBackupScheduler, stopBackupScheduler } from "../../../infrastructure/services/backup-scheduler";
import { logger } from "../../../infrastructure/logger";

type FakeTask = { stop: ReturnType<typeof mock.fn>; start: ReturnType<typeof mock.fn> };

function makeFakeTask(): FakeTask {
  return { stop: mock.fn(() => {}), start: mock.fn(() => {}) };
}

const ENV_BACKUP: Record<string, string | undefined> = {};
const ENV_KEYS = ["BACKUP_ENABLED", "BACKUP_CRON", "BACKUP_RETENTION_DAYS", "BACKUP_PATH"];

beforeEach(() => {
  for (const key of ENV_KEYS) {
    ENV_BACKUP[key] = process.env[key];
  }
  // Force getBackupConfig to skip the DB branch by tripping the catch first time;
  // even if pool exists, the connection will fail in tests. Tests below set explicit
  // env values for the env-fallback path.
  process.env.BACKUP_PATH = "/tmp/drawhaus-test-backups";
  // Silence noisy logger by default; tests that observe calls re-mock per test.
  mock.method(logger, "info", () => {});
  mock.method(logger, "error", () => {});
});

afterEach(() => {
  // Ensure no module-level task leaks between tests
  stopBackupScheduler();
  for (const key of ENV_KEYS) {
    if (ENV_BACKUP[key] === undefined) delete process.env[key];
    else process.env[key] = ENV_BACKUP[key];
  }
  mock.restoreAll();
});

describe("startBackupScheduler — disabled config", () => {
  it("does not schedule when BACKUP_ENABLED=false and logs the 'disabled' message", async () => {
    process.env.BACKUP_ENABLED = "false";
    process.env.BACKUP_CRON = "0 3 * * *";
    const scheduleMock = mock.method(cron, "schedule", () => makeFakeTask() as unknown as cron.ScheduledTask);
    // Re-mock info to capture calls
    const infoMock = mock.method(logger, "info", () => {});

    await startBackupScheduler();

    assert.equal(scheduleMock.mock.calls.length, 0, "cron.schedule must not be called when disabled");
    const disabledCall = infoMock.mock.calls.find(
      (c) => typeof c.arguments[0] === "string" && c.arguments[0] === "Backup scheduler disabled",
    );
    assert.ok(disabledCall, "logger.info('Backup scheduler disabled') must be emitted");
  });
});

describe("startBackupScheduler — invalid cron expression", () => {
  it("does not schedule and logs an error when cron.validate returns false", async () => {
    process.env.BACKUP_ENABLED = "true";
    process.env.BACKUP_CRON = "not-a-cron";
    const validateMock = mock.method(cron, "validate", () => false);
    const scheduleMock = mock.method(cron, "schedule", () => makeFakeTask() as unknown as cron.ScheduledTask);
    const errorMock = mock.method(logger, "error", () => {});

    await startBackupScheduler();

    assert.equal(validateMock.mock.calls.length, 1);
    assert.equal(validateMock.mock.calls[0].arguments[0], "not-a-cron");
    assert.equal(scheduleMock.mock.calls.length, 0, "cron.schedule must not be called when expression is invalid");
    assert.equal(errorMock.mock.calls.length, 1);
    const errPayload = errorMock.mock.calls[0].arguments[0] as { schedule: string };
    assert.equal(errPayload.schedule, "not-a-cron");
    assert.equal(errorMock.mock.calls[0].arguments[1], "Invalid backup cron expression, scheduler not started");
  });
});

describe("startBackupScheduler — valid config", () => {
  it("calls cron.schedule with the configured cron expression", async () => {
    process.env.BACKUP_ENABLED = "true";
    process.env.BACKUP_CRON = "*/15 * * * *";
    mock.method(cron, "validate", () => true);
    const fakeTask = makeFakeTask();
    const scheduleMock = mock.method(cron, "schedule", () => fakeTask as unknown as cron.ScheduledTask);

    await startBackupScheduler();

    assert.equal(scheduleMock.mock.calls.length, 1);
    assert.equal(scheduleMock.mock.calls[0].arguments[0], "*/15 * * * *");
    assert.equal(typeof scheduleMock.mock.calls[0].arguments[1], "function");
  });
});

describe("startBackupScheduler — restart with existing task", () => {
  it("stops the previously scheduled task before scheduling a new one", async () => {
    process.env.BACKUP_ENABLED = "true";
    process.env.BACKUP_CRON = "0 3 * * *";
    mock.method(cron, "validate", () => true);

    const firstTask = makeFakeTask();
    const secondTask = makeFakeTask();
    let callCount = 0;
    const scheduleMock = mock.method(cron, "schedule", () => {
      callCount += 1;
      return (callCount === 1 ? firstTask : secondTask) as unknown as cron.ScheduledTask;
    });

    await startBackupScheduler();
    assert.equal(scheduleMock.mock.calls.length, 1);
    assert.equal(firstTask.stop.mock.calls.length, 0);

    await startBackupScheduler();
    assert.equal(scheduleMock.mock.calls.length, 2);
    assert.equal(firstTask.stop.mock.calls.length, 1, "first task must be stopped before second schedule");
    assert.equal(secondTask.stop.mock.calls.length, 0);
  });
});

describe("stopBackupScheduler", () => {
  it("is a no-op when no task is currently scheduled", () => {
    // Should not throw, no mocks needed
    assert.doesNotThrow(() => stopBackupScheduler());
  });

  it("stops the active task and a subsequent call is a no-op", async () => {
    process.env.BACKUP_ENABLED = "true";
    process.env.BACKUP_CRON = "0 3 * * *";
    mock.method(cron, "validate", () => true);
    const task = makeFakeTask();
    mock.method(cron, "schedule", () => task as unknown as cron.ScheduledTask);

    await startBackupScheduler();
    assert.equal(task.stop.mock.calls.length, 0);

    stopBackupScheduler();
    assert.equal(task.stop.mock.calls.length, 1);

    // Subsequent stop must NOT call task.stop again
    stopBackupScheduler();
    assert.equal(task.stop.mock.calls.length, 1);
  });
});
