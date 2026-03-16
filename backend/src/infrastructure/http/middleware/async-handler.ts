import type { Request, RequestHandler, Response } from "express";
import Honeybadger from "@honeybadger-io/js";
import { DomainError } from "../../../domain/errors";
import { domainErrorToStatus } from "./error-mapper";
import { logger } from "../../logger";

import type { UserRole } from "../../../domain/entities/user";

export type AuthedRequest = Request & {
  authUser: { id: string; email: string; name: string; role: UserRole; disabled: boolean };
};

function isPostgresInvalidInput(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code: string }).code === "22P02";
}

export function asyncRoute(
  handler: (req: AuthedRequest, res: Response) => Promise<Response | void>,
): RequestHandler {
  return (req, res) => {
    handler(req as AuthedRequest, res).catch((error: unknown) => {
      if (error instanceof DomainError) {
        res.status(domainErrorToStatus(error)).json({ error: error.message });
        return;
      }
      if (isPostgresInvalidInput(error)) {
        res.status(400).json({ error: "Invalid input" });
        return;
      }
      (req.log ?? logger).error(error, "Route failed");
      Honeybadger.notify(error instanceof Error ? error : new Error(String(error)), {
        context: { method: req.method, url: req.originalUrl },
      });
      res.status(500).json({ error: "Internal server error" });
    });
  };
}

export function asyncPublicRoute(
  handler: (req: Request, res: Response) => Promise<Response | void>,
): RequestHandler {
  return (req, res) => {
    handler(req, res).catch((error: unknown) => {
      if (error instanceof DomainError) {
        res.status(domainErrorToStatus(error)).json({ error: error.message });
        return;
      }
      if (isPostgresInvalidInput(error)) {
        res.status(400).json({ error: "Invalid input" });
        return;
      }
      (req.log ?? logger).error(error, "Route failed");
      Honeybadger.notify(error instanceof Error ? error : new Error(String(error)), {
        context: { method: req.method, url: req.originalUrl },
      });
      res.status(500).json({ error: "Internal server error" });
    });
  };
}
