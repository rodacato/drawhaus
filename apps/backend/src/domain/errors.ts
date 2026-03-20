export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export class NotFoundError extends DomainError {
  constructor(resource: string) {
    super("NOT_FOUND", `${resource} not found`);
  }
}

export class ForbiddenError extends DomainError {
  constructor() {
    super("FORBIDDEN", "Insufficient permissions");
  }
}

export class ConflictError extends DomainError {
  constructor(message: string) {
    super("CONFLICT", message);
  }
}

export class ExpiredError extends DomainError {
  constructor(resource: string) {
    super("EXPIRED", `${resource} has expired`);
  }
}

export class UnauthorizedError extends DomainError {
  constructor() {
    super("UNAUTHORIZED", "Unauthorized");
  }
}

export class InvalidInputError extends DomainError {
  constructor(message = "Invalid input") {
    super("INVALID_INPUT", message);
  }
}

export class DriveTokenError extends DomainError {
  constructor(message = "Google Drive authorization required") {
    super("DRIVE_TOKEN_ERROR", message);
  }
}
