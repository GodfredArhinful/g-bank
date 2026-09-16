# Milestone 1: Database and Ledger Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Learning project override:** tasks marked **Owner: G** are written by G, not by an agent. Claude teaches, reviews, and answers questions during those tasks. Only steps marked **Claude** may be executed by an agent.

**Goal:** Money can be stored and moved correctly in code, proven by tests against a real Postgres: a double-entry ledger with database-level guardrails, a funding account, `openAccount` and `createDeposit` services, a reconciliation check, and a production database on Neon. No HTTP endpoints for money yet and no login. That's M2 and M3.

**Architecture:** Drizzle defines the tables in TypeScript (`server/src/db/schema.ts`) and generates SQL migration files that are committed and applied everywhere with one command. Services are plain functions that take the database as their first argument and plain data as the second, run inside one database transaction with row locks, and return the API shapes from the contract. Tests run against `gbank_test` on your laptop and a Postgres container in CI; every test starts from a clean, seeded bank and ends with a ledger reconciliation.

**Tech Stack:** Postgres 17 (Postgres.app locally, a `postgres:17` container in CI, Neon in production), drizzle-orm 0.45, drizzle-kit 0.31, pg 8.23, plus everything from M0.

**Spec:** [docs/10-roadmap.md, M1](../10-roadmap.md#m1-database-and-ledger-core), with details from [03-database.md](../03-database.md), [06-money-movement.md](../06-money-movement.md) (sections 6.7 and 6.9), [04-api.md](../04-api.md#46-shared-objects), [08-testing-quality.md](../08-testing-quality.md#82-test-setup), and [09-deployment.md](../09-deployment.md#95-neon-setup).

**Verified:** not yet against a live database. There is no Postgres on this machine until Task 1 installs Postgres.app. Right after Task 1, Claude runs every file in this plan in a scratch copy against `gbank_test` and fixes anything that differs before Task 2 starts. The Drizzle API calls used here (`check`, `pgEnum`, `generatedAlwaysAsIdentity`, `.for("update")`, `onConflictDoNothing`, `db.$client`, `DrizzleQueryError.cause`) were confirmed against the installed drizzle-orm 0.45.2 source on 2026-09-16.

## Global Constraints

Everything from the M0 plan still applies (Node 24, TypeScript ~6.0, erasable syntax only, `.ts` import extensions, Conventional Commits, one task = one branch = one PR, `.env` never committed). New for M1:

- Every amount is an integer number of cents in a `bigint` column, read as a JavaScript `number` (`bigint({ mode: "number" })`). Never floats (decision D9).
- Ledger rows (`transactions`, `entries`) are append-only. Code never updates or deletes them, and a trigger refuses it (decision D10).
- Postgres enums, not TypeScript enums: `pgEnum("account_type", [...])`.
- Every money movement is one database transaction: `db.transaction(async (tx) => { ... })`. Locks are taken with `SELECT ... FOR UPDATE`, lower account ID first.
- Services never see `req` or `res`. They take `(db, input)` and return plain data or throw an `AppError`.
- All time comes from `clock.now()`, never `new Date()` directly in application code.
- Migration files are never edited after they've run anywhere. Mistakes get a new migration.

## How to use this plan

Same as M0: **Owner: G** tasks start with a **Concept** section, give the tests in full (the tests are the spec), and fold a reference solution underneath for after a real attempt. **Claude** steps are done by Claude and reviewed by G in the pull request.

**Issues (decision D21):** Task 1 = #19, Task 2 = #20, Task 3 = #21, Task 4 = #22, Task 5 = #23, Task 6 = #24. Branch names and commit commands below use those numbers.

**Suggested sessions:** Session 1 = Task 1 (mostly clicking and typing SQL). Session 2 = Task 2. Session 3 = Tasks 3 and 4. Session 4 = Task 5 (the biggest). Session 5 = Task 6.

**Decisions made by this plan** (added to the decision log in `docs/README.md`):

- **D23:** the `users` table is created in M1, before there is any auth, because `accounts.user_id` and `transactions.initiated_by` point at it. Tests insert users directly with a placeholder password hash until M2 brings argon2.
- **D24:** one `npm run db:migrate` command for every environment. It applies pending migrations and then makes sure the funding account exists, so laptop, test, and Neon databases are set up the same way. Render's start command becomes `npm run db:migrate && npm start`.
- **D25:** services take the database as their first argument (`createDeposit(db, input)`). Tests pass `testDb`, the app passes the pool it built from `DATABASE_URL`, and no module holds a global connection.

## Files at the end of M1

```
g-bank/
├─ vitest.config.ts                  two projects: shared (no DB) and server (DB harness)   (Task 2)
├─ .github/workflows/ci.yml          + postgres:17 service and TEST_DATABASE_URL             (Task 2)
├─ .env.example                      + DATABASE_URL, TEST_DATABASE_URL                       (Task 2)
├─ docs/labs/m1-sql-lab.md           the psql exercises, with G's notes                      (Task 1)
├─ shared/src/schemas/accounts.ts    Account, AccountType, AccountStatus                     (Task 5)
├─ shared/src/schemas/transactions.ts Transaction, TransactionType, TransactionParty        (Task 5)
├─ shared/src/schemas/health.ts      status: "ok" | "unavailable"                            (Task 6)
└─ server/
   ├─ drizzle.config.ts              where the schema and migrations live                    (Task 2)
   ├─ src/config.ts                  + DATABASE_URL, MIGRATION_DATABASE_URL                  (Task 2)
   ├─ src/app.ts                     builds the db from config, passes it to routers         (Task 6)
   ├─ src/db/
   │  ├─ schema.ts                   enums, users, accounts, transactions, entries           (Task 2)
   │  ├─ client.ts                   createDb(url), Db and Tx types                          (Task 2)
   │  ├─ migrate.ts                  migrateDatabase(url): migrations + funding account      (Task 2, seed added in Task 4)
   │  ├─ migrations/                 0000_*.sql (generated), 0001_append_only_ledger.sql     (Tasks 2, 3)
   │  ├─ seed.ts                     seedFundingAccount(db), FUNDING_ACCOUNT_NUMBER           (Task 4)
   │  └─ reconcile.ts                reconcile(db): the three ledger checks                  (Task 4)
   ├─ src/lib/
   │  ├─ clock.ts                    clock.now(), clock.set(), clock.reset()                 (Task 5)
   │  ├─ accountNumber.ts            generateAccountNumber()                                 (Task 5)
   │  └─ pgErrors.ts                 pgErrorOf(err), isUniqueViolation(err)                  (Task 2)
   ├─ src/modules/
   │  ├─ accounts/service.ts         openAccount(db, input), toAccount(row)                  (Task 5)
   │  ├─ deposits/service.ts         createDeposit(db, input)                                (Task 5)
   │  └─ health/routes.ts            createHealthRouter(db): /health and /health/ready       (Task 6)
   └─ test/
      ├─ globalSetup.ts              migrates gbank_test once per run                         (Task 2)
      ├─ setup.ts                    reset before each test, reconcile after each            (Task 2, reconcile in Task 4)
      ├─ helpers/env.ts              TEST_DATABASE_URL                                        (Task 2)
      ├─ helpers/config.ts           testConfig                                               (Task 2)
      ├─ helpers/db.ts               testDb, resetDatabase(), dbErrorOf(), closeTestDb()      (Task 2)
      ├─ helpers/users.ts            createTestUser()                                         (Task 2)
      ├─ db/schema.test.ts           6 tests                                                  (Task 2)
      ├─ db/appendOnly.test.ts       4 tests                                                  (Task 3)
      ├─ db/reconcile.test.ts        4 tests                                                  (Task 4)
      ├─ modules/accounts.test.ts    6 tests                                                  (Task 5)
      ├─ modules/deposits.test.ts    7 tests                                                  (Task 5)
      └─ health.test.ts              + 2 readiness tests                                      (Task 6)
```

Test count: 15 after M0, 22 after Task 2 (6 new, 1 new config test), 26 after Task 3, 30 after Task 4, 44 after Task 5 (13 service tests + 1 shared schema test), 46 after Task 6.

---

### Task 1: Local Postgres and the SQL lab

**Owner:** G, guided. Claude wrote the lab.

**Concept.** Postgres is a separate program that runs in the background on your laptop and answers queries over a socket. Postgres.app is the easiest way to run it on a Mac: one app, no configuration, and it installs `psql`, the command-line client. Before an ORM writes SQL for you, you write some yourself, so that when Drizzle generates a `CHECK` constraint in Task 2 you already know what it does.

**Files:**
- Modify: `docs/labs/m1-sql-lab.md` (fill in the **My notes** section)

**Interfaces:**
- Produces: databases `gbank_dev` and `gbank_test` on your laptop, reachable at `postgres://localhost:5432/<name>` with no password (Postgres.app trusts local connections from your macOS user).

- [ ] **Step 1: Install Postgres.app**

Download the Postgres 17 build from https://postgresapp.com (the "Latest release" download includes 17). Move it to Applications, open it, click **Initialize**. An elephant icon appears in the menu bar. Green means running.

Add the command-line tools to your PATH (this is what the app's docs say to do):

```bash
sudo mkdir -p /etc/paths.d && echo /Applications/Postgres.app/Contents/Versions/latest/bin | sudo tee /etc/paths.d/postgresapp
```

Open a **new** terminal tab (PATH changes only apply to new shells), then:

```bash
psql --version
```

Expected: `psql (PostgreSQL) 17.x`.

- [ ] **Step 2: Create the two databases**

```bash
createdb gbank_dev && createdb gbank_test
```

No output means success. Check with:

```bash
psql -l
```

Both names should be in the list. `\q` or `q` gets you out of the pager.

- [ ] **Step 3: Branch**

```bash
git switch main && git pull && git switch -c docs/19-sql-lab
```

- [ ] **Step 4: Do the lab**

Open [docs/labs/m1-sql-lab.md](../labs/m1-sql-lab.md) and work through it in a terminal. It uses a throwaway database `gbank_lab`, so nothing touches `gbank_dev`. Write your answers in the **My notes** section as you go. Expect about 45 minutes.

- [ ] **Step 5: Commit and open the PR**

```bash
git add docs/labs/m1-sql-lab.md
git commit -m "docs: add my SQL lab notes" -m "Closes #19"
git push -u origin docs/19-sql-lab
gh pr create --fill
```

Claude reviews the notes in the PR (that's the comprehension check for this task), then you merge.

- [ ] **Step 6: Claude verifies the rest of this plan**

With Postgres running, Claude runs Tasks 2 to 5 in a scratch copy against `gbank_test` and fixes any line of this plan that doesn't hold up. Nothing for you to do here except wait for the "verified" note.

**Check yourself**
1. What's the difference between `WHERE` and `HAVING`?
2. In exercise 9, why did terminal B hang, and what made it continue?
3. Which kind of constraint would stop two customers from having the same account number?

---

### Task 2: Drizzle schema, first migration, and the test harness

**Owner:** G writes the tables. Claude installs packages, writes the config, client, migration runner, test harness, and CI change.

**Concept.** An ORM (object-relational mapper) lets you describe tables in your programming language and then writes SQL for you. Drizzle stays close to SQL on purpose: `pgTable("accounts", { ... })` reads almost like `CREATE TABLE accounts (...)`, and its query builder reads almost like `SELECT`. From `schema.ts`, `drizzle-kit generate` writes a **migration**: a `.sql` file that creates or changes tables one step at a time. Migrations are committed with the code and applied with `npm run db:migrate`, so every database (laptop, CI, Neon) reaches the same structure the same way.

Two things you'll meet for the first time:
- **`bigint({ mode: "number" })`**: Postgres stores 64-bit integers; JavaScript numbers are exact only up to 2^53 (about $90 trillion in cents). We tell Drizzle to hand us plain numbers, and we're nowhere near the edge.
- **Drizzle wraps database errors.** When Postgres refuses a row, Drizzle throws a `DrizzleQueryError` whose message is the failed query, and the real Postgres error (with the constraint name) is on `error.cause`. The test helper `dbErrorOf()` unwraps it.

**Files:**
- Create: `server/drizzle.config.ts`, `server/src/db/schema.ts`, `server/src/db/client.ts`, `server/src/db/migrate.ts`, `server/src/lib/pgErrors.ts`, `vitest.config.ts`, `server/test/globalSetup.ts`, `server/test/setup.ts`, `server/test/helpers/env.ts`, `server/test/helpers/config.ts`, `server/test/helpers/db.ts`, `server/test/helpers/users.ts`
- Generated: `server/src/db/migrations/0000_<random-name>.sql` and `server/src/db/migrations/meta/` (commit all of it)
- Modify: `server/src/config.ts`, `server/test/config.test.ts`, `server/test/health.test.ts`, `server/test/errors.test.ts`, `.env.example`, `.env` (yours, not committed), `package.json` (root), `server/package.json`, `.github/workflows/ci.yml`
- Test: `server/test/db/schema.test.ts`

**Interfaces:**
- Consumes: `loadConfig` (M0 Task 3)
- Produces: `createDb(url: string): Db`, types `Db` and `Tx`; `migrateDatabase(url: string): Promise<void>`; schema exports `accountType`, `accountStatus`, `transactionType`, `users`, `accounts`, `transactions`, `entries`; `pgErrorOf(err: unknown): PgError | null`, `isUniqueViolation(err: unknown): boolean`; test helpers `testDb`, `resetDatabase()`, `dbErrorOf(promise)`, `closeTestDb()`, `createTestUser(overrides?)`, `testConfig`, `TEST_DATABASE_URL`
- `Config` gains `DATABASE_URL: string` (required) and `MIGRATION_DATABASE_URL?: string`

- [ ] **Step 1: Branch (G)**

```bash
git switch main && git pull && git switch -c feat/20-schema
```

- [ ] **Step 2: Install the packages (Claude)**

```bash
npm install -w @g-bank/server drizzle-orm@^0.45.2 pg@^8.23.0
npm install -D drizzle-kit@^0.31.10 @types/pg@^8.23.1
```

- [ ] **Step 3: Config and env (Claude)**

`server/src/config.ts`, add two lines to `ConfigSchema` after `LOG_LEVEL`:

```ts
  DATABASE_URL: z.string().min(1),
  MIGRATION_DATABASE_URL: z.string().min(1).optional(),
```

`DATABASE_URL` is required: the server can't do anything useful without it, so it should refuse to start, the same way a missing `PORT` would be caught. `MIGRATION_DATABASE_URL` is only for Neon, where migrations should skip the connection pooler (Task 6).

`server/test/config.test.ts` becomes:

```ts
import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.ts";

const required = { DATABASE_URL: "postgres://localhost:5432/gbank_dev" };

describe("loadConfig", () => {
  it("uses defaults when optional variables are missing", () => {
    expect(loadConfig(required)).toEqual({
      NODE_ENV: "development",
      PORT: 3000,
      LOG_LEVEL: "info",
      DATABASE_URL: required.DATABASE_URL,
    });
  });

  it("refuses to start without DATABASE_URL", () => {
    expect(() => loadConfig({})).toThrow(/DATABASE_URL/);
  });

  it("turns PORT from text into a number", () => {
    expect(loadConfig({ ...required, PORT: "8080" }).PORT).toBe(8080);
  });

  it("names the bad variable when PORT is not a number", () => {
    expect(() => loadConfig({ ...required, PORT: "not-a-number" })).toThrow(/PORT/);
  });

  it("rejects an unknown NODE_ENV", () => {
    expect(() => loadConfig({ ...required, NODE_ENV: "staging" })).toThrow(/NODE_ENV/);
  });
});
```

`.env.example`, add:

```
DATABASE_URL=postgres://localhost:5432/gbank_dev
TEST_DATABASE_URL=postgres://localhost:5432/gbank_test
```

G adds the same two lines to `.env`.

- [ ] **Step 4: Drizzle config and scripts (Claude)**

`server/drizzle.config.ts`:

```ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
});
```

`server/package.json`, add to `scripts`:

```json
    "db:generate": "drizzle-kit generate",
    "db:migrate": "node --env-file-if-exists=../.env src/db/migrate.ts"
```

Root `package.json`, add to `scripts` (the trailing `--` lets `npm run db:generate -- --custom` pass flags through to drizzle-kit, which Task 3 needs):

```json
    "db:generate": "npm run db:generate -w @g-bank/server --",
    "db:migrate": "npm run db:migrate -w @g-bank/server"
```

- [ ] **Step 5: Write the failing test (Claude writes the file, G reads it)**

`server/test/db/schema.test.ts`:

```ts
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
      testDb.insert(accounts).values({ userId: null, accountNumber: "1234567890", type: "checking" }),
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
    await testDb.insert(accounts).values({ userId: user.id, accountNumber: "1234567890", type: "checking" });
    const error = await dbErrorOf(
      testDb.insert(accounts).values({ userId: user.id, accountNumber: "1234567890", type: "savings" }),
    );
    expect(error.code).toBe("23505");
    expect(error.constraint).toBe("accounts_account_number_unique");
  });
});
```

`23505` is Postgres's error code for "unique violation". Every Postgres error has a five-character code; `23514` is a failed `CHECK`, `23503` a failed foreign key. Codes are stable across versions, messages aren't, so code is what programs compare.

- [ ] **Step 6: Test harness (Claude)**

`vitest.config.ts` at the repo root. Two projects, because `shared/` tests are pure functions and should never need a database:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "shared",
          include: ["shared/test/**/*.test.ts"],
        },
      },
      {
        test: {
          name: "server",
          include: ["server/test/**/*.test.ts"],
          // Test files share one database, so they must not run at the same time.
          fileParallelism: false,
          globalSetup: ["server/test/globalSetup.ts"],
          setupFiles: ["server/test/setup.ts"],
        },
      },
    ],
  },
});
```

`server/test/helpers/env.ts`:

```ts
// Postgres.app accepts local connections from your macOS user with no password.
export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgres://localhost:5432/gbank_test";
```

`server/test/globalSetup.ts` (runs once before the whole server project):

```ts
import { migrateDatabase } from "../src/db/migrate.ts";
import { TEST_DATABASE_URL } from "./helpers/env.ts";

export async function setup() {
  await migrateDatabase(TEST_DATABASE_URL);
}
```

`server/test/setup.ts` (runs inside every server test file):

```ts
import { afterAll, beforeEach } from "vitest";
import { closeTestDb, resetDatabase } from "./helpers/db.ts";

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await closeTestDb();
});
```

`server/test/helpers/db.ts`:

```ts
import { sql } from "drizzle-orm";
import { createDb } from "../../src/db/client.ts";
import { pgErrorOf, type PgError } from "../../src/lib/pgErrors.ts";
import { TEST_DATABASE_URL } from "./env.ts";

export const testDb = createDb(TEST_DATABASE_URL);

// Wipes every table so each test starts from an empty bank.
// TRUNCATE doesn't fire row triggers, so it still works once the ledger is append-only (Task 3).
export async function resetDatabase() {
  await testDb.execute(sql`TRUNCATE TABLE entries, transactions, accounts, users RESTART IDENTITY CASCADE`);
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
```

`server/test/helpers/users.ts`:

```ts
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
```

`server/test/helpers/config.ts`:

```ts
import { loadConfig } from "../../src/config.ts";
import { TEST_DATABASE_URL } from "./env.ts";

export const testConfig = loadConfig({
  NODE_ENV: "test",
  LOG_LEVEL: "silent",
  DATABASE_URL: TEST_DATABASE_URL,
});
```

`server/test/health.test.ts`: replace the `loadConfig` import and the `const app = ...` line with:

```ts
import { testConfig } from "./helpers/config.ts";

const app = createApp(testConfig);
```

`server/test/errors.test.ts`: same idea. Replace the `loadConfig` import with `import { testConfig } from "./helpers/config.ts";` and in "the real app" test use `createApp(testConfig)`.

`server/src/lib/pgErrors.ts`:

```ts
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
```

`.github/workflows/ci.yml`, give the `check` job a Postgres to talk to. Add `services:` and `env:` between `runs-on:` and `steps:`:

```yaml
  check:
    name: Lint, typecheck, test
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:17
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: gbank_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd "pg_isready -U postgres"
          --health-interval 5s
          --health-timeout 5s
          --health-retries 10
    env:
      TEST_DATABASE_URL: postgres://postgres:postgres@localhost:5432/gbank_test
    steps:
```

- [ ] **Step 7: Run the test and watch it fail (G)**

```bash
npx vitest run server/test/db/schema.test.ts
```

Expected: FAIL with `Cannot find module '../../src/db/schema.ts'`.

- [ ] **Step 8: Client and migration runner (Claude)**

`server/src/db/client.ts`:

```ts
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
```

`server/src/db/migrate.ts`:

```ts
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
```

- [ ] **Step 9: Write the schema yourself (G)**

`server/src/db/schema.ts`. The three enums and the `users` table are given below as the pattern. You write `accounts`, `transactions`, and `entries` from the tables in [03-database.md section 3.3](../03-database.md#33-tables-in-detail), following the same style. The constraint names in the tests (`accounts_balance_non_negative`, `accounts_system_has_no_owner`, `accounts_account_number_format`, `accounts_account_number_unique`) are the names you must use.

```ts
import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  bigint,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const accountType = pgEnum("account_type", ["checking", "savings", "system"]);
export const accountStatus = pgEnum("account_status", ["active", "frozen", "closed"]);
export const transactionType = pgEnum("transaction_type", [
  "welcome_bonus",
  "deposit",
  "internal_transfer",
  "p2p_transfer",
  "reversal",
]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    fullName: text("full_name").notNull(),
    passwordHash: text("password_hash").notNull(),
    failedLoginCount: integer("failed_login_count").notNull().default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("users_email_unique").on(t.email),
    check("users_full_name_length", sql`char_length(${t.fullName}) BETWEEN 1 AND 100`),
  ],
);

// accounts: you write it. Columns from 03-database.md. Constraints:
//   uniqueIndex "accounts_account_number_unique" on account_number
//   index "accounts_user_id_idx" on user_id
//   check "accounts_account_number_format":   account_number ~ '^[0-9]{10}$'
//   check "accounts_nickname_length":         char_length(nickname) <= 30
//   check "accounts_currency_usd":            currency = 'USD'
//   check "accounts_system_has_no_owner":     (type = 'system') = (user_id IS NULL)
//   check "accounts_balance_non_negative":    type = 'system' OR balance_cents >= 0
// Foreign key: userId references users.id with { onDelete: "restrict" }.

// transactions: you write it. created_at has NO default: the app passes clock.now().
//   index "transactions_initiated_by_type_created_at_idx" on (initiated_by, type, created_at)
//   check "transactions_note_length": char_length(note) <= 140
// The self-reference needs an explicit return type, or TypeScript can't infer it:
//   reversesId: uuid("reverses_id").references((): AnyPgColumn => transactions.id),

// entries: you write it. id is a counting number:
//   id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
//   index "entries_account_history_idx" on (account_id, created_at DESC, id DESC)
//        -> index(...).on(t.accountId, t.createdAt.desc(), t.id.desc())
//   index "entries_transaction_id_idx" on transaction_id
//   check "entries_amount_not_zero": amount_cents <> 0
```

Hints:
- A column is `name: type("column_name")` followed by modifiers: `.notNull()`, `.default(0)`, `.defaultNow()`, `.references(() => users.id)`.
- An enum column is `type: accountType("type").notNull()`.
- `check(name, sql\`...\`)` writes raw SQL; put column references as `${t.columnName}` so Drizzle fills in the real column name.
- A `CHECK` passes when the expression is true **or null**. `char_length(nickname) <= 30` is null when `nickname` is null, so an empty nickname passes without any `IS NULL OR`.

<details>
<summary>Reference solution</summary>

```ts
export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "restrict" }),
    accountNumber: text("account_number").notNull(),
    type: accountType("type").notNull(),
    status: accountStatus("status").notNull().default("active"),
    nickname: text("nickname"),
    currency: text("currency").notNull().default("USD"),
    balanceCents: bigint("balance_cents", { mode: "number" }).notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("accounts_account_number_unique").on(t.accountNumber),
    index("accounts_user_id_idx").on(t.userId),
    check("accounts_account_number_format", sql`${t.accountNumber} ~ '^[0-9]{10}$'`),
    check("accounts_nickname_length", sql`char_length(${t.nickname}) <= 30`),
    check("accounts_currency_usd", sql`${t.currency} = 'USD'`),
    check("accounts_system_has_no_owner", sql`(${t.type} = 'system') = (${t.userId} IS NULL)`),
    check("accounts_balance_non_negative", sql`${t.type} = 'system' OR ${t.balanceCents} >= 0`),
  ],
);

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: transactionType("type").notNull(),
    initiatedBy: uuid("initiated_by").references(() => users.id),
    note: text("note"),
    reversesId: uuid("reverses_id").references((): AnyPgColumn => transactions.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    index("transactions_initiated_by_type_created_at_idx").on(t.initiatedBy, t.type, t.createdAt),
    check("transactions_note_length", sql`char_length(${t.note}) <= 140`),
  ],
);

export const entries = pgTable(
  "entries",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    transactionId: uuid("transaction_id")
      .notNull()
      .references(() => transactions.id),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id),
    amountCents: bigint("amount_cents", { mode: "number" }).notNull(),
    balanceAfterCents: bigint("balance_after_cents", { mode: "number" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    index("entries_account_history_idx").on(t.accountId, t.createdAt.desc(), t.id.desc()),
    index("entries_transaction_id_idx").on(t.transactionId),
    check("entries_amount_not_zero", sql`${t.amountCents} <> 0`),
  ],
);
```

</details>

- [ ] **Step 10: Generate the migration and read it (G)**

```bash
npm run db:generate
```

drizzle-kit writes `server/src/db/migrations/0000_<two-random-words>.sql` and a `meta/` folder next to it. Open the `.sql` file. It's the `CREATE TABLE` statements for your schema, in Postgres's words. Read every `CONSTRAINT` line and match it to the table in 03-database.md. If something's missing or wrong, fix `schema.ts`, delete the generated `.sql` file **and** the `meta/` folder (nothing has run anywhere yet, so this is the one time deleting is allowed), and generate again.

- [ ] **Step 11: Apply it to your dev database (G)**

```bash
npm run db:migrate
```

Expected: `Migrations applied to gbank_dev`. Then look at the result in psql:

```bash
psql gbank_dev -c '\d accounts'
```

Your seven constraints are listed under "Check constraints" and "Indexes".

- [ ] **Step 12: Run the tests and watch them pass (G)**

```bash
npx vitest run server/test/db/schema.test.ts
```

Expected: `Tests  6 passed (6)`. The global setup applied the same migration to `gbank_test` first.

- [ ] **Step 13: Full check, commit, PR (G)**

```bash
npm run check
```

Expected: 22 tests passing.

```bash
git add -A
git commit -m "feat: define the ledger schema and run tests against Postgres" -m "Closes #20"
git push -u origin feat/20-schema
gh pr create --fill
```

Watch CI: the `check` job now starts a Postgres container before running the tests. Merge when green.

**Check yourself**
1. Why does `entries.created_at` have no default while `accounts.created_at` has `defaultNow()`?
2. What does `TRUNCATE ... RESTART IDENTITY CASCADE` do, and why do tests need each part?
3. A `CHECK` sees a `NULL` nickname. Does the row pass or fail? Why?

---

### Task 3: The append-only ledger trigger

**Owner:** G, guided.

**Concept.** A bank's ledger is written in ink. If a transfer was wrong, you don't erase it, you write a reversing transaction. Our code will never update or delete a ledger row, but "our code will never" isn't a guarantee. A **trigger** is a small function Postgres runs automatically before or after a row changes. Ours raises an error on any `UPDATE` or `DELETE` of `transactions` or `entries`, so even a bug, a wrong `psql` command, or a future teammate can't rewrite history. `TRUNCATE` doesn't fire row triggers, so tests can still wipe the table.

Drizzle can't express triggers in `schema.ts`, so this is a **custom migration**: drizzle-kit creates an empty numbered `.sql` file and you write the SQL. Statements are separated by `--> statement-breakpoint` lines so the migrator runs them one at a time.

**Files:**
- Create: `server/src/db/migrations/0001_append_only_ledger.sql` (generated empty, you fill it)
- Test: `server/test/db/appendOnly.test.ts`

**Interfaces:**
- Consumes: `testDb`, `createTestUser`, `dbErrorOf`, the schema tables (Task 2)
- Produces: the database refuses `UPDATE`/`DELETE` on `transactions` and `entries` with the message `ledger rows are append-only (<OP> on <table>)`

- [ ] **Step 1: Branch**

```bash
git switch main && git pull && git switch -c feat/21-append-only
```

- [ ] **Step 2: Write the failing tests**

`server/test/db/appendOnly.test.ts`:

```ts
import { eq, sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { accounts, entries, transactions } from "../../src/db/schema.ts";
import { dbErrorOf, testDb } from "../helpers/db.ts";
import { createTestUser } from "../helpers/users.ts";

// Writes one balanced deposit by hand: bank -100, customer +100.
async function plantOneTransaction() {
  const user = await createTestUser();
  const now = new Date();
  const [bank] = await testDb
    .insert(accounts)
    .values({ userId: null, accountNumber: "0000000002", type: "system", balanceCents: -100 })
    .returning();
  const [customer] = await testDb
    .insert(accounts)
    .values({ userId: user.id, accountNumber: "1111111111", type: "checking", balanceCents: 100 })
    .returning();
  const [transaction] = await testDb
    .insert(transactions)
    .values({ type: "deposit", initiatedBy: user.id, createdAt: now })
    .returning();
  if (!bank || !customer || !transaction) throw new Error("insert returned no row");
  await testDb.insert(entries).values([
    { transactionId: transaction.id, accountId: bank.id, amountCents: -100, balanceAfterCents: -100, createdAt: now },
    { transactionId: transaction.id, accountId: customer.id, amountCents: 100, balanceAfterCents: 100, createdAt: now },
  ]);
  return transaction;
}

describe("the append-only ledger", () => {
  it("refuses to update an entry", async () => {
    const transaction = await plantOneTransaction();
    const error = await dbErrorOf(
      testDb.update(entries).set({ amountCents: 999 }).where(eq(entries.transactionId, transaction.id)),
    );
    expect(error.message).toContain("ledger rows are append-only (UPDATE on entries)");
  });

  it("refuses to delete an entry", async () => {
    const transaction = await plantOneTransaction();
    const error = await dbErrorOf(testDb.delete(entries).where(eq(entries.transactionId, transaction.id)));
    expect(error.message).toContain("ledger rows are append-only (DELETE on entries)");
  });

  it("refuses to update or delete a transaction", async () => {
    const transaction = await plantOneTransaction();
    const updateError = await dbErrorOf(
      testDb.update(transactions).set({ note: "edited" }).where(eq(transactions.id, transaction.id)),
    );
    expect(updateError.message).toContain("UPDATE on transactions");
    const deleteError = await dbErrorOf(testDb.delete(transactions).where(eq(transactions.id, transaction.id)));
    expect(deleteError.message).toContain("DELETE on transactions");
  });

  it("still allows TRUNCATE, so tests can reset the bank", async () => {
    await plantOneTransaction();
    await testDb.execute(sql`TRUNCATE TABLE entries, transactions, accounts, users RESTART IDENTITY CASCADE`);
    const result = await testDb.execute(sql`SELECT COUNT(*)::int AS n FROM entries`);
    expect(result.rows[0]?.n).toBe(0);
  });
});
```

- [ ] **Step 3: Run them and watch them fail**

```bash
npx vitest run server/test/db/appendOnly.test.ts
```

Expected: the first three fail with `Expected the query to fail, but it succeeded.` The update and delete went through, because nothing stops them yet. The TRUNCATE test passes already.

- [ ] **Step 4: Create the empty migration**

```bash
npm run db:generate -- --custom --name=append_only_ledger
```

Expected: a new file `server/src/db/migrations/0001_append_only_ledger.sql` containing only a comment, plus an updated `meta/_journal.json`.

- [ ] **Step 5: Write the trigger yourself**

Fill `0001_append_only_ledger.sql` with the SQL from [03-database.md section 3.4](../03-database.md#34-guardrails-inside-the-database): one function `forbid_ledger_changes()` and two triggers. Put `--> statement-breakpoint` on its own line between each statement (three statements, two breakpoints). The function body between `$$ ... $$` must stay in one statement.

<details>
<summary>Reference solution</summary>

```sql
CREATE FUNCTION forbid_ledger_changes() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'ledger rows are append-only (% on %)', TG_OP, TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER entries_append_only
  BEFORE UPDATE OR DELETE ON entries
  FOR EACH ROW EXECUTE FUNCTION forbid_ledger_changes();
--> statement-breakpoint
CREATE TRIGGER transactions_append_only
  BEFORE UPDATE OR DELETE ON transactions
  FOR EACH ROW EXECUTE FUNCTION forbid_ledger_changes();
```

</details>

- [ ] **Step 6: Apply it and watch the tests pass**

```bash
npm run db:migrate
npx vitest run server/test/db/appendOnly.test.ts
```

Expected: `Tests  4 passed (4)`. Then try it by hand, to feel it:

```bash
psql gbank_dev -c "UPDATE entries SET amount_cents = 1"
```

Expected: `ERROR:  ledger rows are append-only (UPDATE on entries)`. (There are no rows yet, but `BEFORE ... FOR EACH ROW` only fires per row, so this may report `UPDATE 0` instead. Either way the tests prove it.)

- [ ] **Step 7: Full check, commit, PR**

```bash
npm run check
git add -A
git commit -m "feat: make ledger tables append-only with a trigger" -m "Closes #21"
git push -u origin feat/21-append-only
gh pr create --fill
```

Expected: 26 tests.

**Check yourself**
1. Why a trigger in the database instead of "just don't write UPDATE statements"?
2. Why does `TRUNCATE` still work?
3. This migration has already run on your laptop. You notice a typo in the error message. What do you do, and what must you not do?

---

### Task 4: Funding account seed and reconciliation

**Owner:** G writes `seed.ts` and `reconcile.ts`. Claude wires them into `migrate.ts` and the test harness.

**Concept.** Two ideas. First, **seed data**: rows that must exist before the app can work. G-Bank has exactly one, the funding account, the system account every deposit draws from. Seeding must be **idempotent**: running it twice creates one account, not two. `INSERT ... ON CONFLICT DO NOTHING` on the unique account number does that in one statement.

Second, **reconciliation**: three queries that must return nothing, from [03-database.md section 3.4](../03-database.md#34-guardrails-inside-the-database). Every transaction's entries add up to zero. Every cached balance equals the sum of its entries. All balances in the bank add up to zero. Running them after **every test** turns every test into a ledger test: if any future code path breaks the books, the very next test run says so, even if that test wasn't about money.

One trap: `pg` returns Postgres 64-bit integers (`bigint`, and the result of `SUM`) as **strings**, because a JavaScript number can't hold every 64-bit value. Drizzle converts its own `bigint({ mode: "number" })` columns for you, but raw `db.execute` results don't get that, so `reconcile.ts` wraps them in `Number(...)`.

**Files:**
- Create: `server/src/db/seed.ts`, `server/src/db/reconcile.ts`
- Modify: `server/src/db/migrate.ts`, `server/test/helpers/db.ts`, `server/test/setup.ts`, `server/package.json`, `package.json` (root)
- Test: `server/test/db/reconcile.test.ts`

**Interfaces:**
- Consumes: `Db`, `createDb`, schema tables, `testDb`, `resetDatabase`, `createTestUser`
- Produces: `FUNDING_ACCOUNT_NUMBER = "0000000001"`, `seedFundingAccount(db: Db): Promise<void>`, `reconcile(db: Db): Promise<ReconcileReport>` where `ReconcileReport = { unbalancedTransactions: { transactionId: string; totalCents: number }[]; mismatchedBalances: { accountId: string; cachedCents: number; fromEntriesCents: number }[]; totalCents: number; problems: string[] }`; test helper `expectLedgerClean()`; scripts `npm run db:seed` and `npm run db:reconcile`

- [ ] **Step 1: Branch**

```bash
git switch main && git pull && git switch -c feat/22-reconcile
```

- [ ] **Step 2: Write the failing tests**

`server/test/db/reconcile.test.ts`:

```ts
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { reconcile } from "../../src/db/reconcile.ts";
import { accounts, entries, transactions } from "../../src/db/schema.ts";
import { FUNDING_ACCOUNT_NUMBER, seedFundingAccount } from "../../src/db/seed.ts";
import { resetDatabase, testDb } from "../helpers/db.ts";
import { createTestUser } from "../helpers/users.ts";

describe("seedFundingAccount", () => {
  it("creates exactly one funding account no matter how often it runs", async () => {
    await seedFundingAccount(testDb);
    await seedFundingAccount(testDb);
    const rows = await testDb.select().from(accounts).where(eq(accounts.accountNumber, FUNDING_ACCOUNT_NUMBER));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ type: "system", userId: null, balanceCents: 0 });
  });
});

describe("reconcile", () => {
  it("reports no problems on a fresh bank", async () => {
    const report = await reconcile(testDb);
    expect(report.problems).toEqual([]);
    expect(report.totalCents).toBe(0);
  });

  it("finds a transaction whose entries don't add up to zero", async () => {
    const user = await createTestUser();
    const now = new Date();
    const [account] = await testDb
      .insert(accounts)
      .values({ userId: user.id, accountNumber: "1111111111", type: "checking", balanceCents: 700 })
      .returning();
    const [transaction] = await testDb
      .insert(transactions)
      .values({ type: "deposit", initiatedBy: user.id, createdAt: now })
      .returning();
    if (!account || !transaction) throw new Error("insert returned no row");
    // Only one side of the deposit. Nobody gave up the 700.
    await testDb.insert(entries).values({
      transactionId: transaction.id,
      accountId: account.id,
      amountCents: 700,
      balanceAfterCents: 700,
      createdAt: now,
    });

    const report = await reconcile(testDb);
    expect(report.unbalancedTransactions).toEqual([{ transactionId: transaction.id, totalCents: 700 }]);
    expect(report.problems.some((p) => p.includes(transaction.id))).toBe(true);

    await resetDatabase(); // leave the bank clean for the check that runs after every test
  });

  it("finds a cached balance that disagrees with its entries", async () => {
    const user = await createTestUser();
    const [account] = await testDb
      .insert(accounts)
      .values({ userId: user.id, accountNumber: "2222222222", type: "savings", balanceCents: 500 })
      .returning();
    if (!account) throw new Error("insert returned no row");

    const report = await reconcile(testDb);
    expect(report.mismatchedBalances).toEqual([{ accountId: account.id, cachedCents: 500, fromEntriesCents: 0 }]);
    expect(report.totalCents).toBe(500);
    expect(report.problems.length).toBeGreaterThanOrEqual(2);

    await resetDatabase();
  });
});
```

- [ ] **Step 3: Run them and watch them fail**

```bash
npx vitest run server/test/db/reconcile.test.ts
```

Expected: FAIL with `Cannot find module '../../src/db/reconcile.ts'`.

- [ ] **Step 4: Write `seed.ts` yourself**

`server/src/db/seed.ts` exports the constant and an idempotent `seedFundingAccount(db)`. Use `db.insert(accounts).values({...}).onConflictDoNothing({ target: accounts.accountNumber })`. Give it `nickname: "G-Bank funding"`. Add the same "run directly" block as `migrate.ts` so `npm run db:seed` works.

<details>
<summary>Reference solution</summary>

```ts
import { createDb, type Db } from "./client.ts";
import { accounts } from "./schema.ts";

export const FUNDING_ACCOUNT_NUMBER = "0000000001";

// The system account every deposit draws from. Safe to run many times:
// the unique account number turns a second insert into a no-op.
export async function seedFundingAccount(db: Db) {
  await db
    .insert(accounts)
    .values({ userId: null, accountNumber: FUNDING_ACCOUNT_NUMBER, type: "system", nickname: "G-Bank funding" })
    .onConflictDoNothing({ target: accounts.accountNumber });
}

// `npm run db:seed` runs this file directly.
if (process.argv[1] === import.meta.filename) {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("Set DATABASE_URL before seeding.");
    process.exit(1);
  }
  const db = createDb(url);
  try {
    await seedFundingAccount(db);
    console.log("Funding account is in place.");
  } finally {
    await db.$client.end();
  }
}
```

</details>

- [ ] **Step 5: Write `reconcile.ts` yourself**

`server/src/db/reconcile.ts`: run the three queries from 03-database.md with `db.execute(sql\`...\`)`, convert the numbers with `Number(...)`, and build `problems`, one readable sentence per bad row plus one if the total isn't zero. Then a "run directly" block that prints the report and exits with code 1 when there are problems, so a script or CI step can fail on it.

<details>
<summary>Reference solution</summary>

```ts
import { sql } from "drizzle-orm";
import { createDb, type Db } from "./client.ts";

export type ReconcileReport = {
  unbalancedTransactions: { transactionId: string; totalCents: number }[];
  mismatchedBalances: { accountId: string; cachedCents: number; fromEntriesCents: number }[];
  totalCents: number;
  problems: string[];
};

// The three ledger checks from docs/03-database.md section 3.4. All must come back empty.
export async function reconcile(db: Db): Promise<ReconcileReport> {
  const unbalanced = await db.execute(sql`
    SELECT transaction_id, SUM(amount_cents) AS total
    FROM entries
    GROUP BY transaction_id
    HAVING SUM(amount_cents) <> 0
  `);
  const mismatched = await db.execute(sql`
    SELECT a.id, a.balance_cents, COALESCE(SUM(e.amount_cents), 0) AS from_entries
    FROM accounts a
    LEFT JOIN entries e ON e.account_id = a.id
    GROUP BY a.id
    HAVING a.balance_cents <> COALESCE(SUM(e.amount_cents), 0)
  `);
  const total = await db.execute(sql`SELECT COALESCE(SUM(balance_cents), 0) AS total FROM accounts`);

  // pg hands back 64-bit integers as strings, so convert.
  const unbalancedTransactions = unbalanced.rows.map((row) => ({
    transactionId: String(row.transaction_id),
    totalCents: Number(row.total),
  }));
  const mismatchedBalances = mismatched.rows.map((row) => ({
    accountId: String(row.id),
    cachedCents: Number(row.balance_cents),
    fromEntriesCents: Number(row.from_entries),
  }));
  const totalCents = Number(total.rows[0]?.total ?? 0);

  const problems = [
    ...unbalancedTransactions.map((t) => `transaction ${t.transactionId}: entries add up to ${t.totalCents}, not 0`),
    ...mismatchedBalances.map(
      (a) => `account ${a.accountId}: cached balance ${a.cachedCents} but entries add up to ${a.fromEntriesCents}`,
    ),
    ...(totalCents === 0 ? [] : [`all balances add up to ${totalCents}, not 0`]),
  ];

  return { unbalancedTransactions, mismatchedBalances, totalCents, problems };
}

// `npm run db:reconcile` runs this file directly. Exit code 1 means the books don't balance.
if (process.argv[1] === import.meta.filename) {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("Set DATABASE_URL before reconciling.");
    process.exit(1);
  }
  const db = createDb(url);
  try {
    const report = await reconcile(db);
    if (report.problems.length === 0) {
      console.log("Ledger OK: every transaction balances, every cached balance matches, total is 0.");
    } else {
      console.error(`Ledger problems (${report.problems.length}):`);
      for (const problem of report.problems) console.error(`  ${problem}`);
      process.exitCode = 1;
    }
  } finally {
    await db.$client.end();
  }
}
```

</details>

- [ ] **Step 6: Wire it in (Claude)**

`server/src/db/migrate.ts`: import `seedFundingAccount` from `./seed.ts` and call it right after `migrate(...)` inside the `try`. Now every database that has been migrated also has its funding account (decision D24).

`server/test/helpers/db.ts`: import `seedFundingAccount` and `reconcile`, add the seed to `resetDatabase`, and add the after-test check:

```ts
export async function resetDatabase() {
  await testDb.execute(sql`TRUNCATE TABLE entries, transactions, accounts, users RESTART IDENTITY CASCADE`);
  await seedFundingAccount(testDb);
}

// Fails the current test if the books don't balance.
export async function expectLedgerClean() {
  const report = await reconcile(testDb);
  if (report.problems.length > 0) {
    throw new Error(`Ledger check failed after this test:\n  ${report.problems.join("\n  ")}`);
  }
}
```

`server/test/setup.ts`, add:

```ts
afterEach(async () => {
  await expectLedgerClean();
});
```

(and add `afterEach` to the vitest import).

`server/package.json` scripts:

```json
    "db:seed": "node --env-file-if-exists=../.env src/db/seed.ts",
    "db:reconcile": "node --env-file-if-exists=../.env src/db/reconcile.ts"
```

Root `package.json` scripts:

```json
    "db:seed": "npm run db:seed -w @g-bank/server",
    "db:reconcile": "npm run db:reconcile -w @g-bank/server"
```

- [ ] **Step 7: Run everything**

```bash
npm run db:migrate
npm run db:reconcile
```

Expected: the funding account is created in `gbank_dev`, and `Ledger OK: ...`.

```bash
npm run check
```

Expected: 30 tests, and every server test now ends with a reconciliation.

- [ ] **Step 8: Commit, PR**

```bash
git add -A
git commit -m "feat: seed the funding account and reconcile the ledger after every test" -m "Closes #22"
git push -u origin feat/22-reconcile
gh pr create --fill
```

**Check yourself**
1. Why must `seedFundingAccount` be safe to run twice?
2. A bug updates `balance_cents` but forgets to insert the entries. Which of the three checks catches it?
3. Why does `reconcile.ts` wrap results in `Number(...)` when the schema already says `mode: "number"`?

---

### Task 5: Account and deposit services

**Owner:** G. Claude gives the shared schemas, the clock, and the test files.

**Concept.** A **service** is a plain function with the business rules in it: `openAccount(db, input)` and `createDeposit(db, input)`. No `req`, no `res`, no HTTP. In M3 a route handler will validate the body with Zod, call the service, and send the result. Because the service is plain, tests call it directly with `testDb`.

`createDeposit` is [06-money-movement.md section 6.7](../06-money-movement.md#67-deposits) without idempotency (that's M3): one `db.transaction`, lock the two account rows with `SELECT ... FOR UPDATE` ordered by ID, check the account is active, insert one `transactions` row and two `entries` that add up to zero, update both cached balances, return the `Transaction` shape. If anything throws, Drizzle rolls the whole thing back.

Why the lock: two deposits to the same account at the same moment both read the balance, both add, and one overwrites the other. The last test in this task fires ten deposits at once and expects exactly the right total. Without `.for("update")` it fails.

`openAccount` picks a random 10-digit number; the unique index is the referee if two accounts collide, and the service just tries again (up to 5 times, [03-database.md section 3.6](../03-database.md#36-account-numbers)). The "at most 5 open accounts" rule locks the user's row first, the same trick M3 uses for the daily limit, so two simultaneous requests can't both squeeze in a sixth.

**Files:**
- Create: `shared/src/schemas/accounts.ts`, `shared/src/schemas/transactions.ts`, `server/src/lib/clock.ts`, `server/src/lib/accountNumber.ts`, `server/src/modules/accounts/service.ts`, `server/src/modules/deposits/service.ts`
- Modify: `shared/src/index.ts`, `shared/test/schemas.test.ts`, `server/test/setup.ts`
- Test: `server/test/modules/accounts.test.ts`, `server/test/modules/deposits.test.ts`

**Interfaces:**
- Consumes: `Db`, schema tables, `AppError`, `NotFoundError`, `isUniqueViolation`, `FUNDING_ACCOUNT_NUMBER`, `testDb`, `createTestUser`
- Produces (shared): `Account`, `AccountType`, `AccountStatus`, `Transaction`, `TransactionType`, `TransactionParty` schemas and types
- Produces (server): `clock.now(): Date`, `clock.set(date: Date)`, `clock.reset()`; `generateAccountNumber(): string`; `MAX_OPEN_ACCOUNTS = 5`, `openAccount(db: Db, input: { userId: string; type: "checking" | "savings"; nickname?: string }): Promise<Account>`, `toAccount(row: typeof accounts.$inferSelect): Account`; `MAX_DEPOSIT_CENTS = 1_000_000`, `createDeposit(db: Db, input: { userId: string; accountId: string; amountCents: number }): Promise<Transaction>`
- Error codes thrown: `404 not_found`, `422 account_limit_reached`, `422 account_not_active`, `400 validation_error`

- [ ] **Step 1: Branch**

```bash
git switch main && git pull && git switch -c feat/23-services
```

- [ ] **Step 2: Shared contract (Claude)**

`shared/src/schemas/accounts.ts`:

```ts
import { z } from "zod";

export const AccountType = z.enum(["checking", "savings"]);
export const AccountStatus = z.enum(["active", "frozen", "closed"]);

// The Account object from docs/04-api.md section 4.6. System accounts are never exposed.
export const Account = z.object({
  id: z.uuid(),
  accountNumber: z.string().regex(/^[0-9]{10}$/),
  type: AccountType,
  nickname: z.string().max(30).nullable(),
  status: AccountStatus,
  currency: z.literal("USD"),
  balanceCents: z.number().int().nonnegative(),
  createdAt: z.iso.datetime(),
});

export type AccountType = z.infer<typeof AccountType>;
export type AccountStatus = z.infer<typeof AccountStatus>;
export type Account = z.infer<typeof Account>;
```

`shared/src/schemas/transactions.ts`:

```ts
import { z } from "zod";

export const TransactionType = z.enum(["welcome_bonus", "deposit", "internal_transfer", "p2p_transfer", "reversal"]);

// One side of a money movement. accountId is only filled in for accounts you own.
export const TransactionParty = z.object({
  accountId: z.uuid().nullable(),
  accountNumberLast4: z.string().regex(/^[0-9]{4}$/),
  displayName: z.string(),
});

// The Transaction object from docs/04-api.md section 4.6. amountCents is always positive: the size of the move.
export const Transaction = z.object({
  id: z.uuid(),
  type: TransactionType,
  amountCents: z.number().int().positive(),
  from: TransactionParty.nullable(),
  to: TransactionParty,
  note: z.string().max(140).nullable(),
  createdAt: z.iso.datetime(),
});

export type TransactionType = z.infer<typeof TransactionType>;
export type TransactionParty = z.infer<typeof TransactionParty>;
export type Transaction = z.infer<typeof Transaction>;
```

`shared/src/index.ts`, add:

```ts
export * from "./schemas/accounts.ts";
export * from "./schemas/transactions.ts";
```

`shared/test/schemas.test.ts`, add one test inside the existing file:

```ts
import { Account } from "../src/index.ts";

describe("Account", () => {
  it("rejects an account number that isn't 10 digits", () => {
    const result = Account.safeParse({
      id: "0f8e6b2a-3c4d-4e5f-8a9b-1c2d3e4f5a6b",
      accountNumber: "12345",
      type: "checking",
      nickname: null,
      status: "active",
      currency: "USD",
      balanceCents: 0,
      createdAt: "2026-09-10T14:00:00.000Z",
    });
    expect(result.success).toBe(false);
  });
});
```

(Merge the import with the file's existing import from `../src/index.ts`.)

- [ ] **Step 3: The clock (Claude)**

`server/src/lib/clock.ts`:

```ts
// Every "what time is it?" in application code goes through here, so tests can move time.
let frozenAt: Date | null = null;

export const clock = {
  now(): Date {
    return frozenAt ? new Date(frozenAt) : new Date();
  },
  set(date: Date) {
    frozenAt = date;
  },
  reset() {
    frozenAt = null;
  },
};
```

`server/test/setup.ts`, add to the existing `afterEach` so a test that froze time can't leak it into the next one:

```ts
afterEach(async () => {
  clock.reset();
  await expectLedgerClean();
});
```

(with `import { clock } from "../src/lib/clock.ts";`).

- [ ] **Step 4: Write the failing tests (Claude writes, G reads every `it` before starting)**

`server/test/modules/accounts.test.ts`:

```ts
import { Account } from "@g-bank/shared";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { accounts } from "../../src/db/schema.ts";
import { MAX_OPEN_ACCOUNTS, openAccount } from "../../src/modules/accounts/service.ts";
import { testDb } from "../helpers/db.ts";
import { createTestUser } from "../helpers/users.ts";

describe("openAccount", () => {
  it("opens an active account with a 10-digit number and no money", async () => {
    const user = await createTestUser();
    const account = await openAccount(testDb, { userId: user.id, type: "savings", nickname: "Rainy day" });
    expect(Account.parse(account)).toMatchObject({
      type: "savings",
      nickname: "Rainy day",
      status: "active",
      currency: "USD",
      balanceCents: 0,
    });
    expect(account.accountNumber).toMatch(/^[0-9]{10}$/);
  });

  it("stores the account under its owner", async () => {
    const user = await createTestUser();
    const account = await openAccount(testDb, { userId: user.id, type: "checking" });
    const [row] = await testDb.select().from(accounts).where(eq(accounts.id, account.id));
    expect(row?.userId).toBe(user.id);
    expect(row?.nickname).toBeNull();
  });

  it("gives every account a different number", async () => {
    const user = await createTestUser();
    const first = await openAccount(testDb, { userId: user.id, type: "checking" });
    const second = await openAccount(testDb, { userId: user.id, type: "checking" });
    expect(first.accountNumber).not.toBe(second.accountNumber);
  });

  it("refuses a sixth open account", async () => {
    const user = await createTestUser();
    for (let i = 0; i < MAX_OPEN_ACCOUNTS; i++) {
      await openAccount(testDb, { userId: user.id, type: "checking" });
    }
    await expect(openAccount(testDb, { userId: user.id, type: "savings" })).rejects.toMatchObject({
      status: 422,
      code: "account_limit_reached",
    });
  });

  it("doesn't count closed accounts toward the limit", async () => {
    const user = await createTestUser();
    for (let i = 0; i < MAX_OPEN_ACCOUNTS; i++) {
      await openAccount(testDb, { userId: user.id, type: "checking" });
    }
    const [oldest] = await testDb.select().from(accounts).where(eq(accounts.userId, user.id)).limit(1);
    if (!oldest) throw new Error("no account");
    await testDb.update(accounts).set({ status: "closed" }).where(eq(accounts.id, oldest.id));
    await expect(openAccount(testDb, { userId: user.id, type: "savings" })).resolves.toMatchObject({ type: "savings" });
  });

  it("refuses an unknown user with a 404", async () => {
    await expect(openAccount(testDb, { userId: randomUUID(), type: "checking" })).rejects.toMatchObject({
      status: 404,
      code: "not_found",
    });
  });
});
```

`server/test/modules/deposits.test.ts`:

```ts
import { Transaction } from "@g-bank/shared";
import { asc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { accounts, entries } from "../../src/db/schema.ts";
import { FUNDING_ACCOUNT_NUMBER } from "../../src/db/seed.ts";
import { clock } from "../../src/lib/clock.ts";
import { openAccount } from "../../src/modules/accounts/service.ts";
import { MAX_DEPOSIT_CENTS, createDeposit } from "../../src/modules/deposits/service.ts";
import { testDb } from "../helpers/db.ts";
import { createTestUser } from "../helpers/users.ts";

async function userWithAccount(nickname?: string) {
  const user = await createTestUser();
  const account = await openAccount(testDb, { userId: user.id, type: "checking", nickname });
  return { user, account };
}

async function balanceOf(accountId: string) {
  const [row] = await testDb.select({ balanceCents: accounts.balanceCents }).from(accounts).where(eq(accounts.id, accountId));
  return row?.balanceCents;
}

describe("createDeposit", () => {
  it("raises the balance and writes two entries that add up to zero", async () => {
    const { user, account } = await userWithAccount();
    const transaction = await createDeposit(testDb, { userId: user.id, accountId: account.id, amountCents: 10_000 });

    expect(await balanceOf(account.id)).toBe(10_000);
    const rows = await testDb.select().from(entries).where(eq(entries.transactionId, transaction.id)).orderBy(asc(entries.amountCents));
    expect(rows).toHaveLength(2);
    expect(rows[0]?.amountCents).toBe(-10_000);
    expect(rows[1]?.amountCents).toBe(10_000);
    expect(rows[1]?.balanceAfterCents).toBe(10_000);
    expect((rows[0]?.amountCents ?? 0) + (rows[1]?.amountCents ?? 0)).toBe(0);

    const [funding] = await testDb.select().from(accounts).where(eq(accounts.accountNumber, FUNDING_ACCOUNT_NUMBER));
    expect(funding?.balanceCents).toBe(-10_000);
  });

  it("returns the Transaction shape with the account's last 4 digits", async () => {
    const { user, account } = await userWithAccount("Everyday");
    const transaction = await createDeposit(testDb, { userId: user.id, accountId: account.id, amountCents: 2_500 });
    expect(Transaction.parse(transaction)).toMatchObject({
      type: "deposit",
      amountCents: 2_500,
      from: null,
      to: { accountId: account.id, accountNumberLast4: account.accountNumber.slice(-4), displayName: "Everyday" },
      note: null,
    });
  });

  it("stamps the transaction with the clock's time", async () => {
    const { user, account } = await userWithAccount();
    clock.set(new Date("2026-01-02T03:04:05.000Z"));
    const transaction = await createDeposit(testDb, { userId: user.id, accountId: account.id, amountCents: 100 });
    expect(transaction.createdAt).toBe("2026-01-02T03:04:05.000Z");
  });

  it("treats someone else's account as not found", async () => {
    const { account } = await userWithAccount();
    const stranger = await createTestUser();
    await expect(createDeposit(testDb, { userId: stranger.id, accountId: account.id, amountCents: 100 })).rejects.toMatchObject({
      status: 404,
      code: "not_found",
    });
    await expect(createDeposit(testDb, { userId: stranger.id, accountId: randomUUID(), amountCents: 100 })).rejects.toMatchObject({
      status: 404,
    });
    expect(await balanceOf(account.id)).toBe(0);
  });

  it("refuses a frozen account and leaves both balances alone", async () => {
    const { user, account } = await userWithAccount();
    await testDb.update(accounts).set({ status: "frozen" }).where(eq(accounts.id, account.id));
    await expect(createDeposit(testDb, { userId: user.id, accountId: account.id, amountCents: 100 })).rejects.toMatchObject({
      status: 422,
      code: "account_not_active",
    });
    expect(await balanceOf(account.id)).toBe(0);
    expect(await testDb.select().from(entries)).toHaveLength(0);
  });

  it("refuses amounts that aren't a whole number of cents from 1 to $10,000", async () => {
    const { user, account } = await userWithAccount();
    for (const amountCents of [0, -1, 12.5, MAX_DEPOSIT_CENTS + 1, Number.NaN]) {
      await expect(createDeposit(testDb, { userId: user.id, accountId: account.id, amountCents })).rejects.toMatchObject({
        status: 400,
        code: "validation_error",
      });
    }
    await expect(createDeposit(testDb, { userId: user.id, accountId: account.id, amountCents: MAX_DEPOSIT_CENTS })).resolves.toBeDefined();
  });

  it("handles ten deposits at the same moment without losing a cent", async () => {
    const { user, account } = await userWithAccount();
    await Promise.all(
      Array.from({ length: 10 }, () => createDeposit(testDb, { userId: user.id, accountId: account.id, amountCents: 100 })),
    );
    expect(await balanceOf(account.id)).toBe(1_000);
    expect(await testDb.select().from(entries).where(eq(entries.accountId, account.id))).toHaveLength(10);
  });
});
```

- [ ] **Step 5: Run them and watch them fail**

```bash
npx vitest run server/test/modules
```

Expected: both files FAIL with `Cannot find module '../../src/modules/accounts/service.ts'`.

- [ ] **Step 6: Write `accountNumber.ts` yourself**

`server/src/lib/accountNumber.ts`: export `generateAccountNumber()` that returns 10 random digits as a string, using `randomInt` from `node:crypto` (not `Math.random`, which isn't meant for anything security-related). Leading zeros are allowed, which is why it's a string.

<details>
<summary>Reference solution</summary>

```ts
import { randomInt } from "node:crypto";

// 10 random digits. A string, so "0042..." keeps its leading zeros.
export function generateAccountNumber(): string {
  let digits = "";
  for (let i = 0; i < 10; i++) {
    digits += String(randomInt(0, 10));
  }
  return digits;
}
```

</details>

- [ ] **Step 7: Write `openAccount` yourself**

`server/src/modules/accounts/service.ts`:
1. `toAccount(row)` converts a database row into the `Account` contract shape: same fields, `createdAt` as an ISO string (`row.createdAt.toISOString()`), and throw a plain `Error` if `row.type === "system"` (those never leave the server).
2. `openAccount(db, input)`: a `for` loop of up to 5 attempts. Each attempt is one `db.transaction`:
   - lock the user's row: `tx.select({ id: users.id }).from(users).where(eq(users.id, input.userId)).for("update")`. No row means `throw new NotFoundError("We couldn't find that user.")`.
   - count this user's accounts whose status is not `closed`: `tx.select({ n: count() }).from(accounts).where(and(eq(accounts.userId, input.userId), ne(accounts.status, "closed")))`. At `MAX_OPEN_ACCOUNTS` or more, throw `new AppError(422, "account_limit_reached", "You can have at most 5 open accounts.")`.
   - insert with `accountNumber: generateAccountNumber()` and `.returning()`, return `toAccount(row)`.
   - `catch (err)`: if `isUniqueViolation(err)` and attempts remain, loop again; otherwise rethrow.

Why retry *around* the transaction and not inside it: once a statement fails inside a Postgres transaction, that transaction is dead and every later statement in it fails too. A fresh attempt needs a fresh transaction.

<details>
<summary>Reference solution</summary>

```ts
import type { Account } from "@g-bank/shared";
import { and, count, eq, ne } from "drizzle-orm";
import type { Db } from "../../db/client.ts";
import { accounts, users } from "../../db/schema.ts";
import { generateAccountNumber } from "../../lib/accountNumber.ts";
import { AppError, NotFoundError } from "../../lib/errors.ts";
import { isUniqueViolation } from "../../lib/pgErrors.ts";

export const MAX_OPEN_ACCOUNTS = 5;
const MAX_NUMBER_ATTEMPTS = 5;

type OpenAccountInput = {
  userId: string;
  type: "checking" | "savings";
  nickname?: string;
};

// Database row -> the Account object from the API contract.
export function toAccount(row: typeof accounts.$inferSelect): Account {
  if (row.type === "system") throw new Error("system accounts are never exposed");
  return {
    id: row.id,
    accountNumber: row.accountNumber,
    type: row.type,
    nickname: row.nickname,
    status: row.status,
    currency: "USD",
    balanceCents: row.balanceCents,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function openAccount(db: Db, input: OpenAccountInput): Promise<Account> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await db.transaction(async (tx) => {
        // Lock the user's row so two simultaneous requests can't both pass the count below.
        const [user] = await tx.select({ id: users.id }).from(users).where(eq(users.id, input.userId)).for("update");
        if (!user) throw new NotFoundError("We couldn't find that user.");

        const [open] = await tx
          .select({ n: count() })
          .from(accounts)
          .where(and(eq(accounts.userId, input.userId), ne(accounts.status, "closed")));
        if ((open?.n ?? 0) >= MAX_OPEN_ACCOUNTS) {
          throw new AppError(422, "account_limit_reached", `You can have at most ${MAX_OPEN_ACCOUNTS} open accounts.`);
        }

        const [row] = await tx
          .insert(accounts)
          .values({
            userId: input.userId,
            accountNumber: generateAccountNumber(),
            type: input.type,
            nickname: input.nickname ?? null,
          })
          .returning();
        if (!row) throw new Error("insert returned no row");
        return toAccount(row);
      });
    } catch (err) {
      // A random number collided with an existing one. Try again with a new number.
      if (isUniqueViolation(err) && attempt < MAX_NUMBER_ATTEMPTS) continue;
      throw err;
    }
  }
}
```

</details>

- [ ] **Step 8: Write `createDeposit` yourself**

`server/src/modules/deposits/service.ts`, in this order inside the function:
1. Before touching the database: if `amountCents` isn't an integer, or is below 1, or above `MAX_DEPOSIT_CENTS`, throw `new AppError(400, "validation_error", "Amount must be between $0.01 and $10,000.00.")`.
2. `db.transaction(async (tx) => { ... })`:
   - Find the customer account by **id and userId** (`and(eq(accounts.id, ...), eq(accounts.userId, ...))`). Missing means `NotFoundError`. A wrong owner looks exactly like a missing account, on purpose (04-api.md explains why 404 and not 403).
   - Find the funding account by `accountNumber = FUNDING_ACCOUNT_NUMBER`. Missing means a plain `Error` telling you to run `npm run db:migrate` (it's a setup bug, not a user error).
   - Lock both rows in one query: `tx.select().from(accounts).where(inArray(accounts.id, [customer.id, funding.id])).orderBy(accounts.id).for("update")`. `orderBy` is the "lower ID first" rule: Postgres takes the locks in the order the rows come back. Pick the two rows out of the result by id.
   - Re-check `status === "active"` on the **locked** customer row (it might have been frozen between the lookup and the lock). Otherwise `new AppError(422, "account_not_active", "This account is frozen or closed.")`.
   - `const now = clock.now();` Insert the `transactions` row (`type: "deposit"`, `initiatedBy: input.userId`, `createdAt: now`) with `.returning()`.
   - Compute both new balances, insert the two `entries` (funding `-amount`, customer `+amount`, each with its `balanceAfterCents` and `createdAt: now`), then `update` both accounts' `balanceCents`.
   - Return the `Transaction`: `from: null`, `to: { accountId, accountNumberLast4: accountNumber.slice(-4), displayName: nickname ?? ("Savings" | "Checking") }`, `note: null`, `createdAt: now.toISOString()`.

<details>
<summary>Reference solution</summary>

```ts
import type { Transaction } from "@g-bank/shared";
import { and, eq, inArray } from "drizzle-orm";
import type { Db } from "../../db/client.ts";
import { accounts, entries, transactions } from "../../db/schema.ts";
import { FUNDING_ACCOUNT_NUMBER } from "../../db/seed.ts";
import { clock } from "../../lib/clock.ts";
import { AppError, NotFoundError } from "../../lib/errors.ts";

export const MAX_DEPOSIT_CENTS = 1_000_000; // $10,000.00

type DepositInput = {
  userId: string;
  accountId: string;
  amountCents: number;
};

export async function createDeposit(db: Db, input: DepositInput): Promise<Transaction> {
  if (!Number.isInteger(input.amountCents) || input.amountCents < 1 || input.amountCents > MAX_DEPOSIT_CENTS) {
    throw new AppError(400, "validation_error", "Amount must be between $0.01 and $10,000.00.");
  }

  return db.transaction(async (tx) => {
    // A wrong owner looks exactly like a missing account: 404, never 403.
    const [customer] = await tx
      .select({ id: accounts.id })
      .from(accounts)
      .where(and(eq(accounts.id, input.accountId), eq(accounts.userId, input.userId)));
    if (!customer) throw new NotFoundError("We couldn't find that account.");

    const [funding] = await tx
      .select({ id: accounts.id })
      .from(accounts)
      .where(eq(accounts.accountNumber, FUNDING_ACCOUNT_NUMBER));
    if (!funding) throw new Error("The funding account is missing. Run npm run db:migrate.");

    // Lock both rows, lower id first, so simultaneous deposits line up instead of racing.
    const locked = await tx
      .select()
      .from(accounts)
      .where(inArray(accounts.id, [customer.id, funding.id]))
      .orderBy(accounts.id)
      .for("update");
    const account = locked.find((row) => row.id === customer.id);
    const bank = locked.find((row) => row.id === funding.id);
    if (!account || !bank) throw new Error("locked rows went missing");
    if (account.status !== "active") {
      throw new AppError(422, "account_not_active", "This account is frozen or closed.");
    }

    const now = clock.now();
    const [transaction] = await tx
      .insert(transactions)
      .values({ type: "deposit", initiatedBy: input.userId, createdAt: now })
      .returning();
    if (!transaction) throw new Error("insert returned no row");

    const bankAfter = bank.balanceCents - input.amountCents;
    const accountAfter = account.balanceCents + input.amountCents;
    await tx.insert(entries).values([
      { transactionId: transaction.id, accountId: bank.id, amountCents: -input.amountCents, balanceAfterCents: bankAfter, createdAt: now },
      { transactionId: transaction.id, accountId: account.id, amountCents: input.amountCents, balanceAfterCents: accountAfter, createdAt: now },
    ]);
    await tx.update(accounts).set({ balanceCents: bankAfter }).where(eq(accounts.id, bank.id));
    await tx.update(accounts).set({ balanceCents: accountAfter }).where(eq(accounts.id, account.id));

    return {
      id: transaction.id,
      type: "deposit",
      amountCents: input.amountCents,
      from: null,
      to: {
        accountId: account.id,
        accountNumberLast4: account.accountNumber.slice(-4),
        displayName: account.nickname ?? (account.type === "savings" ? "Savings" : "Checking"),
      },
      note: null,
      createdAt: now.toISOString(),
    };
  });
}
```

</details>

- [ ] **Step 9: Run the tests and watch them pass**

```bash
npx vitest run server/test/modules
```

Expected: `Tests  13 passed (13)`. If the ten-deposits test fails with a balance under 1000, the lock is missing or not on the right rows.

Then remove `.for("update")` from `createDeposit`, run the deposits file again, and watch the last test fail. Put it back. That's the whole lesson of M1 in one command.

- [ ] **Step 10: Full check, commit, PR**

```bash
npm run check
git add -A
git commit -m "feat: open accounts and record deposits in the ledger" -m "Closes #23"
git push -u origin feat/23-services
gh pr create --fill
```

Expected: 44 tests.

**Check yourself**
1. Walk through two $100 deposits arriving at the same instant. Where does the second one wait, and what does it see when it continues?
2. Why does `createDeposit` look up the account by id **and** user id, instead of by id and then checking the owner?
3. Why is the retry loop in `openAccount` outside `db.transaction` rather than inside it?

---

### Task 6: Neon, migrations on deploy, and the readiness check

**Owner:** G, guided (Neon and Render dashboards). Claude writes the code.

**Concept.** Production needs a database on the internet. Neon hosts Postgres with a free tier. It gives two connection strings: a **pooled** one for the app (a connection pooler sits in front and shares a few real connections among many clients) and a **direct** one for migrations (some migration statements don't work through a pooler). We store them in Render's environment, never in git.

`GET /api/v1/health/ready` runs `SELECT 1`. `200` means the server can reach its database; `503` means it can't. Render keeps using `/health` (process is up) to decide a deploy worked; `/health/ready` is for you, to tell "the server is fine" from "the database is unreachable" in one request.

**Files:**
- Modify: `shared/src/schemas/health.ts`, `server/src/modules/health/routes.ts`, `server/src/app.ts`, `server/test/health.test.ts`, `server/test/errors.test.ts`, `docs/09-deployment.md`, `docs/README.md`
- Render: environment variables `DATABASE_URL`, `MIGRATION_DATABASE_URL`; start command

**Interfaces:**
- Consumes: `createDb`, `Db`, `Config.DATABASE_URL`
- Produces: `createApp(config: Config, deps?: { db?: Db })`, `createHealthRouter(db: Db): Router`; `HealthResponse.status` is `"ok" | "unavailable"`

- [ ] **Step 1: Branch**

```bash
git switch main && git pull && git switch -c feat/24-neon
```

- [ ] **Step 2: Write the failing tests (Claude)**

`server/test/health.test.ts` becomes:

```ts
import { HealthResponse } from "@g-bank/shared";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.ts";
import { createDb } from "../src/db/client.ts";
import { testConfig } from "./helpers/config.ts";
import { testDb } from "./helpers/db.ts";

const app = createApp(testConfig, { db: testDb });

describe("GET /api/v1/health", () => {
  it("says the server is up", async () => {
    const res = await request(app).get("/api/v1/health");
    expect(res.status).toBe(200);
    expect(HealthResponse.parse(res.body)).toEqual({ status: "ok" });
  });

  it("tags the response with a request id", async () => {
    const res = await request(app).get("/api/v1/health");
    expect(res.headers["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("doesn't advertise that it runs Express", async () => {
    const res = await request(app).get("/api/v1/health");
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });
});

describe("GET /api/v1/health/ready", () => {
  it("says ok when the database answers", async () => {
    const res = await request(app).get("/api/v1/health/ready");
    expect(res.status).toBe(200);
    expect(HealthResponse.parse(res.body)).toEqual({ status: "ok" });
  });

  it("says unavailable with a 503 when the database is unreachable", async () => {
    const brokenDb = createDb("postgres://localhost:1/nothing");
    const brokenApp = createApp(testConfig, { db: brokenDb });
    const res = await request(brokenApp).get("/api/v1/health/ready");
    expect(res.status).toBe(503);
    expect(HealthResponse.parse(res.body)).toEqual({ status: "unavailable" });
    await brokenDb.$client.end();
  });
});
```

`server/test/errors.test.ts`, "the real app" test: `createApp(testConfig, { db: testDb })`.

- [ ] **Step 3: Run them and watch them fail**

```bash
npx vitest run server/test/health.test.ts
```

Expected: the two readiness tests fail with 404 (the route doesn't exist), and TypeScript complains about the second argument to `createApp`.

- [ ] **Step 4: Implement (Claude)**

`shared/src/schemas/health.ts`:

```ts
import { z } from "zod";

// "ok" from /health and /health/ready; "unavailable" from /health/ready when the database is down.
export const HealthResponse = z.object({ status: z.enum(["ok", "unavailable"]) });
export type HealthResponse = z.infer<typeof HealthResponse>;
```

`server/src/modules/health/routes.ts`:

```ts
import type { HealthResponse } from "@g-bank/shared";
import { sql } from "drizzle-orm";
import { Router } from "express";
import type { Db } from "../../db/client.ts";

export function createHealthRouter(db: Db) {
  const router = Router();

  // Is the process up? Render calls this after every deploy.
  router.get("/health", (_req, res) => {
    const body: HealthResponse = { status: "ok" };
    res.json(body);
  });

  // Can we reach the database?
  router.get("/health/ready", async (_req, res) => {
    try {
      await db.execute(sql`SELECT 1`);
      const body: HealthResponse = { status: "ok" };
      res.json(body);
    } catch {
      const body: HealthResponse = { status: "unavailable" };
      res.status(503).json(body);
    }
  });

  return router;
}
```

`server/src/app.ts`:

```ts
import express from "express";
import { pinoHttp } from "pino-http";
import type { Config } from "./config.ts";
import { createDb, type Db } from "./db/client.ts";
import { createLogger } from "./logger.ts";
import { createErrorHandler, notFound } from "./middleware/errorHandler.ts";
import { requestId } from "./middleware/requestId.ts";
import { createHealthRouter } from "./modules/health/routes.ts";

// Builds the app without starting it, so tests can use it directly.
// Tests pass their own db; index.ts lets the app build one from DATABASE_URL.
export function createApp(config: Config, deps: { db?: Db } = {}) {
  const logger = createLogger(config);
  const db = deps.db ?? createDb(config.DATABASE_URL);
  const app = express();

  app.disable("x-powered-by");
  app.use(requestId);
  app.use(pinoHttp({ logger, genReqId: (req) => req.id }));

  app.use("/api/v1", createHealthRouter(db));

  app.use(notFound);
  app.use(createErrorHandler(logger));
  return app;
}
```

`docs/09-deployment.md` section 9.4 already says the start command is `npm run db:migrate && npm start` (updated with this plan, decision D24). `docs/README.md` Status: add "Database: Neon, migrated on every deploy."

- [ ] **Step 5: Tests pass, then run it locally**

```bash
npx vitest run server/test/health.test.ts
npm run dev
```

In another tab:

```bash
curl -i http://localhost:3000/api/v1/health/ready
```

Expected: `200` and `{"status":"ok"}`. Now quit Postgres.app from the menu bar and run the curl again: `503` and `{"status":"unavailable"}`. Start Postgres.app again.

- [ ] **Step 6: Create the Neon project (G)**

1. Go to https://neon.tech, sign up with GitHub.
2. **New project.** Name `g-bank`. Postgres version **17** (same as your laptop). Region: the AWS region closest to your Render service (Render Oregon = AWS US West (Oregon); Render Ohio = AWS US East (Ohio)).
3. On the project dashboard click **Connect**. You'll see a connection string. Copy it twice, once with the **Connection pooling** switch on (the host contains `-pooler`) and once with it off. Both start with `postgresql://` and end with `?sslmode=require&channel_binding=require`.
4. Optional but better: in both strings, change `sslmode=require` to `sslmode=verify-full`. With `require`, the `pg` driver encrypts but doesn't verify the server's certificate; `verify-full` does, and Neon's certificate is signed by a public authority Node already trusts.

- [ ] **Step 7: Put them in Render (G)**

Render dashboard, `g-bank` service, **Environment** tab, add:

| Key | Value |
|---|---|
| `DATABASE_URL` | the **pooled** string |
| `MIGRATION_DATABASE_URL` | the **direct** string |

Save. Then **Settings**, **Build & Deploy**, change **Start Command** to:

```
npm run db:migrate && npm start
```

Save. The strings go nowhere else: not in `.env`, not in a file, not in this chat.

- [ ] **Step 8: Commit, PR, merge, watch the deploy**

```bash
npm run check
git add -A
git commit -m "feat: readiness check and migrations on every deploy" -m "Closes #24"
git push -u origin feat/24-neon
gh pr create --fill
```

Expected: 46 tests. Merge. In Render's log for the new deploy you should see `Migrations applied to neondb` before `G-Bank API listening on ...`. Then:

```bash
curl -i https://g-bank.onrender.com/api/v1/health/ready
```

Expected: `200` and `{"status":"ok"}`.

- [ ] **Step 9: Reconcile production (G)**

From your laptop, with the pooled Neon string pasted in place of the placeholder (put a space before the command so zsh doesn't save the URL in your history):

```bash
 DATABASE_URL='<paste the pooled string>' npm run db:reconcile
```

Expected: `Ledger OK: ...`. The funding account exists in production with balance 0 and nothing else. M1 is done.

**Check yourself**
1. Render sets `PORT`, you set `DATABASE_URL`. Trace both from the dashboard to the line of code that uses them.
2. Why do migrations use the direct connection while the app uses the pooled one?
3. A migration fails on deploy. Which version of the server is answering requests one minute later, and why?

---

## M1 is done when

- [ ] Postgres.app runs `gbank_dev` and `gbank_test`, and your SQL lab notes are merged
- [ ] `server/src/db/schema.ts` matches docs/03-database.md, and two migrations are committed: the generated one and the append-only trigger
- [ ] `npm test` shows 46 passing tests, every server test ends with a ledger reconciliation, and CI runs them against a Postgres container
- [ ] `npm run db:reconcile` reports zero problems on your laptop **and** against Neon
- [ ] `https://g-bank.onrender.com/api/v1/health/ready` returns `{"status":"ok"}`, and every deploy runs migrations first
- [ ] Six PRs merged, issues #19 to #24 closed
- [ ] You can explain, without looking: what a migration is, why the ledger is append-only, what `FOR UPDATE` does in `createDeposit`, and what the three reconciliation checks prove
