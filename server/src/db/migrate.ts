import { migrate } from "drizzle-orm/node-postgres/migrator";
import path from "node:path";
import { createDb } from "./client.ts";

const migrationsFolder = path.join(import.meta.dirname, "migrations");

// Applies every migration that hasn't run yet. Safe to run many times.
export async function migrateDatabase(url: string) {
  const db = createDb(url);
  try {
    await migrate(db, { migrationsFolder });
  } finally {
    await db.$client.end();
  }
}

// `npm run db:migrate` runs this file directly; tests import migrateDatabase instead.
if (process.argv[1] === import.meta.filename) {
  const url = process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) {
    console.error("Set DATABASE_URL (or MIGRATION_DATABASE_URL) before running migrations.");
    process.exit(1);
  }
  await migrateDatabase(url);
  console.log(`Migrations applied to ${new URL(url).pathname.slice(1)}`);
}
