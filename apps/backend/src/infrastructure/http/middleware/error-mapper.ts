import { DomainError, NotFoundError, ForbiddenError, ConflictError, ExpiredError, UnauthorizedError, InvalidInputError, DriveTokenError } from "../../../domain/errors";

export function domainErrorToStatus(error: DomainError): number {
  if (error instanceof UnauthorizedError) return 401;
  if (error instanceof DriveTokenError) return 401;
  if (error instanceof ForbiddenError) return 403;
  if (error instanceof NotFoundError) return 404;
  if (error instanceof ConflictError) return 409;
  if (error instanceof ExpiredError) return 410;
  if (error instanceof InvalidInputError) return 400;
  return 500;
}
