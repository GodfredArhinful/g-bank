import { sql } from "drizzle-orm";
import { createDb } from "../../src/db/client.ts";
import { pgErrorOf, type PgError } from "../../src/lib/pgErrors.ts";
import { TEST_DATABASE_URL } from "./env.ts";

export const testDb = createDb(TEST_DATABASE_URL);

// Wipes every table so each test starts from an empty bank.
// TRUNCATE doesn't fire row triggers, so it still works once the ledger is append-only (Task 3).
export async function resetDatabase() {
  await testDb.execute(
    sql`TRUNCATE TABLE entries, transactions, accounts, users RESTART IDENTITY CASCADE`,
  );
}

// Awaits a query that is expected to fail and returns the Postgres error behind Drizzle's wrapper.
export async function dbErrorOf(query: PromiseLike<unknown>): Promise<PgError> {
  try {
    await query;
  } catch (err) {
    const pgError = pgErrorOf(err);
    if (pgError) return pgError;
    throw err;
  }
  throw new Error("Expected the query to fail, but it succeeded.");
}

export async function closeTestDb() {
  await testDb.$client.end();
}
