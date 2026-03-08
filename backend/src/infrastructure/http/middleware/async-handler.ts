import type { Request, RequestHandler, Response } from "express";
import { DomainError } from "../../../domain/errors";
import { domainErrorToStatus } from "./error-mapper";
import { logger } from "../../logger";

import type { UserRole } from "../../../domain/entities/user";

export type AuthedRequest = Request & {
  authUser: { id: string; email: string; name: string; role: UserRole; disabled: boolean };
};

export function asyncRoute(
  handler: (req: AuthedRequest, res: Response) => Promise<Response | void>,
): RequestHandler {
  return (req, res) => {
    handler(req as AuthedRequest, res).catch((error: unknown) => {
      if (error instanceof DomainError) {
        res.status(domainErrorToStatus(error)).json({ error: error.message });
        return;
      }
      (req.log ?? logger).error(error, "Route failed");
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
      (req.log ?? logger).error(error, "Route failed");
      res.status(500).json({ error: "Internal server error" });
    });
  };
}
