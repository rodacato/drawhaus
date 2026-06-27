import type { Request, Response, NextFunction } from "express";
import type { ZodError, ZodType } from "zod";

type ValidationIssue = { path: string; code: string; message: string };

function formatIssues(issues: ZodError["issues"]): ValidationIssue[] {
  return issues.map((issue) => ({
    path: issue.path.join("."),
    code: issue.code,
    message: issue.message,
  }));
}

export function validate(schema: ZodType) {
  return (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body", details: formatIssues(parsed.error.issues) });
      return;
    }
    req.body = parsed.data;
    next();
  };
}

export function validateQuery(schema: ZodType) {
  return (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid query parameters", details: formatIssues(parsed.error.issues) });
      return;
    }
    (req as unknown as Record<string, unknown>).query = parsed.data;
    next();
  };
}

export function validateParams(schema: ZodType) {
  return (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.params);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid path parameters", details: formatIssues(parsed.error.issues) });
      return;
    }
    next();
  };
}
