import type { ErrorRequestHandler } from "express";

// Express's default handler prints the stack with console.error across many lines.
export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  const status = Number(err?.status ?? err?.statusCode);
  const clientError = status >= 400 && status < 500;
  if (clientError) {
    req.log.warn({ err }, "rejected request");
  } else {
    req.log.error({ err }, "unhandled request error");
  }
  if (res.headersSent) {
    next(err);
    return;
  }
  res
    .status(clientError ? status : 500)
    .json({ error: clientError ? err.message : "Internal server error" });
};
