import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { setTimeout as sleep } from "node:timers/promises";
import { createShutdown, type ShutdownStep } from "../../infrastructure/shutdown";

function harness(steps: ShutdownStep[], timeoutMs = 1_000) {
  const exits: number[] = [];
  const errors: string[] = [];
  const logger = {
    info: () => {},
    warn: () => {},
    error: (obj: object, msg: string) => {
      errors.push("step" in obj ? `${msg}: ${String(obj.step)}` : msg);
    },
  };
  const shutdown = createShutdown({ steps, timeoutMs, logger, exit: (code) => exits.push(code) });
  return { shutdown, exits, errors };
}

const hang = () => new Promise<never>(() => {});

describe("createShutdown", () => {
  it("runs every step in order, each after the previous one settles, then exits 0", async () => {
    const order = ["socket.io + http", "backup scheduler", "postgres", "redis"];
    const ran: string[] = [];
    const step = (name: string, ms: number): ShutdownStep => ({
      name,
      run: async () => {
        await sleep(ms);
        ran.push(name);
      },
    });
    const { shutdown, exits } = harness(order.map((name, i) => step(name, 15 - i * 5)));

    await shutdown("SIGTERM");

    assert.deepEqual(ran, order);
    assert.deepEqual(exits, [0]);
  });

  it("keeps closing the rest when one step fails, and exits 1", async () => {
    const ran: string[] = [];
    const { shutdown, exits, errors } = harness([
      { name: "io", run: () => ran.push("io") },
      {
        name: "cron",
        run: () => {
          throw new Error("boom");
        },
      },
      { name: "postgres", run: () => ran.push("postgres") },
    ]);

    await shutdown("SIGTERM");

    assert.deepEqual(ran, ["io", "postgres"]);
    assert.deepEqual(errors, ["Shutdown step failed: cron"]);
    assert.deepEqual(exits, [1]);
  });

  it("exits 1 when the steps outlast the timeout, without running the ones after", async () => {
    const ran: string[] = [];
    const { shutdown, exits } = harness(
      [
        { name: "io", run: hang },
        { name: "postgres", run: () => ran.push("postgres") },
      ],
      20,
    );

    void shutdown("SIGTERM");
    await sleep(60);

    assert.deepEqual(exits, [1]);
    assert.deepEqual(ran, []);
  });

  it("exits only once when a slow step settles after the timeout already fired", async () => {
    const { shutdown, exits } = harness([{ name: "io", run: () => sleep(40) }], 10);

    await shutdown("SIGTERM");

    assert.deepEqual(exits, [1]);
  });

  it("a second signal forces exit 1 without starting the steps again", async () => {
    let started = 0;
    const { shutdown, exits } = harness([
      {
        name: "io",
        run: () => {
          started += 1;
          return hang();
        },
      },
    ]);

    void shutdown("SIGTERM");
    await shutdown("SIGINT");

    assert.equal(started, 1);
    assert.deepEqual(exits, [1]);
  });
});
