import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { accounts } from "../../src/db/schema.ts";
import { dbErrorOf, resetDatabase, testDb } from "../helpers/db.ts";
import { createTestUser } from "../helpers/users.ts";

describe("the ledger schema", () => {
  it("has the four M1 tables", async () => {
    const result = await testDb.execute(
      sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`,
    );
    const names = result.rows.map((row) => row.table_name);
    expect(names).toEqual(expect.arrayContaining(["accounts", "entries", "transactions", "users"]));
  });

  it("refuses a negative balance on a customer account", async () => {
    const user = await createTestUser();
    const error = await dbErrorOf(
      testDb.insert(accounts).values({
        userId: user.id,
        accountNumber: "1234567890",
        type: "checking",
        balanceCents: -1,
      }),
    );
    expect(error.constraint).toBe("accounts_balance_non_negative");
  });

  it("lets a system account go negative", async () => {
    await testDb.insert(accounts).values({
      userId: null,
      accountNumber: "0000000009",
      type: "system",
      balanceCents: -500,
    });
    // Task 4 adds a ledger check after every test. A system account with a balance
    // but no entries would fail it, so this test cleans up after itself.
    await resetDatabase();
  });

  it("refuses a customer account without an owner", async () => {
    const error = await dbErrorOf(
      testDb
        .insert(accounts)
        .values({ userId: null, accountNumber: "1234567890", type: "checking" }),
    );
    expect(error.constraint).toBe("accounts_system_has_no_owner");
  });

  it("refuses an account number that isn't 10 digits", async () => {
    const user = await createTestUser();
    const error = await dbErrorOf(
      testDb.insert(accounts).values({ userId: user.id, accountNumber: "12345", type: "checking" }),
    );
    expect(error.constraint).toBe("accounts_account_number_format");
  });

  it("refuses two accounts with the same number", async () => {
    const user = await createTestUser();
    await testDb
      .insert(accounts)
      .values({ userId: user.id, accountNumber: "1234567890", type: "checking" });
    const error = await dbErrorOf(
      testDb
        .insert(accounts)
        .values({ userId: user.id, accountNumber: "1234567890", type: "savings" }),
    );
    expect(error.code).toBe("23505");
    expect(error.constraint).toBe("accounts_account_number_unique");
  });
});
