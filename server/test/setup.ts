import { afterAll, beforeEach } from "vitest";
import { closeTestDb, resetDatabase } from "./helpers/db.ts";

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await closeTestDb();
});
