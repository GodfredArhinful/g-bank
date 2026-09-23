import { users } from "../../src/db/schema.ts";
import { testDb } from "./db.ts";

let counter = 0;

// Inserts a user directly. Real password hashes arrive with argon2 in M2.
export async function createTestUser(overrides: { email?: string; fullName?: string } = {}) {
  counter += 1;
  const [user] = await testDb
    .insert(users)
    .values({
      email: overrides.email ?? `user${counter}@example.com`,
      fullName: overrides.fullName ?? `Test User ${counter}`,
      passwordHash: "not-a-real-hash",
    })
    .returning();
  if (!user) throw new Error("insert returned no row");
  return user;
}
