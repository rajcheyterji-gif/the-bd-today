// Typed error thrown by services/validators; the app error handler in
// src/server/index.ts converts it to the { success, error } envelope.
import type { ContentfulStatusCode } from "hono/utils/http-status";

export class HttpError extends Error {
  readonly status: ContentfulStatusCode;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: ContentfulStatusCode, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function badRequest(code: string, message: string, details?: unknown): HttpError {
  return new HttpError(400, code, message, details);
}

export function notFound(message = "Not found"): HttpError {
  return new HttpError(404, "NOT_FOUND", message);
}

export function forbidden(message = "Forbidden"): HttpError {
  return new HttpError(403, "FORBIDDEN", message);
}

export function conflict(code: string, message: string): HttpError {
  return new HttpError(409, code, message);
}
