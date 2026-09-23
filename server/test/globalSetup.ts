import { migrateDatabase } from "../src/db/migrate.ts";
import { TEST_DATABASE_URL } from "./helpers/env.ts";

export async function setup() {
  await migrateDatabase(TEST_DATABASE_URL);
}
