import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema.ts";

// One pool per process. Callers pass the returned Db around instead of importing a global.
export function createDb(url: string) {
  const pool = new Pool({ connectionString: url });
  return drizzle({ client: pool, schema });
}

export type Db = ReturnType<typeof createDb>;
// The object you get inside db.transaction(async (tx) => ...).
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
