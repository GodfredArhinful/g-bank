// Postgres.app accepts local connections from your macOS user with no password.
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgres://localhost:5432/gbank_test";
