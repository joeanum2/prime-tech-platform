export type ErrorCode =
  | "VALIDATION_ERROR"
  | "INVALID_CREDENTIALS"
  | "EMAIL_ALREADY_IN_USE"
  | "TOKEN_INVALID_OR_EXPIRED"
  | "AUTH_REQUIRED"
  | "FORBIDDEN"
  | "ORDER_NOT_FOUND"
  | "LICENCE_NOT_FOUND"
  | "LICENCE_MAX_ACTIVATIONS"
  | "BOOKING_NOT_FOUND"
  | "SERVICE_NOT_FOUND"
  | "INVALID_STATUS_TRANSITION"
  | "WEBHOOK_SIGNATURE_INVALID"
  | "RELEASE_NOT_FOUND"
  | "ENTITLEMENT_REQUIRED"
  | "LICENCE_REQUIRED"
  | "LICENCE_INVALID"
  | "FORBIDDEN_OBJECT_KEY"
  | "NOT_IMPLEMENTED";

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly status: number;
  public readonly details?: { fieldErrors?: Record<string, string[]>; meta?: Record<string, unknown> };

  constructor(code: ErrorCode, message: string, status: number, details?: AppError["details"]) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}
