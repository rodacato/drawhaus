type ShutdownLogger = {
  info(obj: object, msg: string): void;
  warn(obj: object, msg: string): void;
  error(obj: object, msg: string): void;
};

export type ShutdownStep = { name: string; run: () => unknown };

/**
 * Runs the steps in order, once. A failing step is logged and the rest still run; exceeding
 * `timeoutMs` or receiving a second signal exits with 1 without waiting for them.
 */
export function createShutdown(options: {
  steps: ShutdownStep[];
  timeoutMs: number;
  logger: ShutdownLogger;
  exit: (code: number) => void;
}): (signal: string) => Promise<void> {
  const { steps, timeoutMs, logger, exit } = options;
  let started = false;
  let exited = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const finish = (code: number) => {
    if (exited) return;
    exited = true;
    clearTimeout(timer);
    exit(code);
  };

  return async (signal) => {
    if (started) {
      logger.warn({ signal }, "Second shutdown signal, forcing exit");
      finish(1);
      return;
    }
    started = true;
    logger.info({ signal, timeoutMs }, "Shutting down");
    timer = setTimeout(() => {
      logger.error({ timeoutMs }, "Shutdown timed out, forcing exit");
      finish(1);
    }, timeoutMs);

    let failed = false;
    for (const step of steps) {
      try {
        await step.run();
      } catch (err) {
        failed = true;
        logger.error({ err, step: step.name }, "Shutdown step failed");
      }
    }
    finish(failed ? 1 : 0);
  };
}

export function onShutdownSignals(shutdown: (signal: string) => Promise<void>): void {
  for (const signal of ["SIGTERM", "SIGINT"] as const) {
    process.on(signal, () => void shutdown(signal));
  }
}
