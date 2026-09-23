// Drizzle wraps driver errors in DrizzleQueryError and keeps the original on `cause`.
export type PgError = Error & { code?: string; constraint?: string; detail?: string };

export function pgErrorOf(err: unknown): PgError | null {
  const cause = err instanceof Error && err.cause instanceof Error ? err.cause : err;
  return cause instanceof Error ? (cause as PgError) : null;
}

// 23505 is Postgres's code for "duplicate key value violates unique constraint".
export function isUniqueViolation(err: unknown): boolean {
  return pgErrorOf(err)?.code === "23505";
}
