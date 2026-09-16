// An error we throw on purpose. The error handler turns it into the standard JSON error.
export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly meta: Record<string, unknown> | undefined;

  constructor(status: number, code: string, message: string, meta?: Record<string, unknown>) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.meta = meta;
  }
}

export class NotFoundError extends AppError {
  constructor(message = "We couldn't find that.") {
    super(404, "not_found", message);
  }
}
