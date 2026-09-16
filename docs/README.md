# G-Bank: next generation banking

> **Demo project.** G-Bank is a learning project that moves fake money. It is not a real bank, holds no real funds, and must never ask anyone for real personal or financial information.

G-Bank is a full-stack web banking app. Customers sign up, open checking and savings accounts, make simulated deposits, send money to each other, and see a complete history of every cent. It is built to feel like a production app: a written API contract, a double-entry ledger, server-side sessions, automated tests, CI, and a live deployment from week one.

## How to read these docs

| # | Doc | What it answers |
|---|---|---|
| 1 | [Product](01-product.md) | What G-Bank does, the rules money must follow, what is out of scope |
| 2 | [Architecture](02-architecture.md) | The big picture: the pieces, how a request flows, folder layout |
| 3 | [Database](03-database.md) | Tables, columns, constraints, and why the ledger looks the way it does |
| 4 | [API contract](04-api.md) | Every endpoint, request, response, and error |
| 5 | [Auth and security](05-auth-security.md) | Sessions, passwords, lockouts, CSRF, and the security checklist |
| 6 | [Money movement](06-money-movement.md) | Exactly how deposits and transfers work, including concurrency |
| 7 | [Frontend](07-frontend.md) | Pages, components, data fetching, the transfer flow |
| 8 | [Testing and quality](08-testing-quality.md) | What we test, CI, code quality, git workflow |
| 9 | [Deployment](09-deployment.md) | Local setup, environments, Render + Neon, launch checklist |
| 10 | [Roadmap](10-roadmap.md) | Milestones at about 5 hours a week, and what you learn in each |
| - | [Glossary](glossary.md) | Every technical term used in these docs, in plain words |

First read: 1, 2, 3, 6, then the rest. Every doc ends with **Check yourself** questions. If you can answer them without scrolling up, you own that part of the design.

## Decision log

Every big choice, why we made it, and what we turned down. If we change our minds later, we add a row instead of editing history (same idea as the ledger).

| # | Decision | Choice | Why | Alternatives considered |
|---|---|---|---|---|
| D1 | Runtime | Node.js 24 + TypeScript | Deploys anywhere; types catch bugs like passing a string where cents are expected | Bun |
| D2 | Repo | One repo, npm workspaces: `server`, `web`, `shared` | One commit can change the contract, server, and UI together | Separate repos |
| D3 | Database | PostgreSQL | ACID transactions, constraints, relational data, free hosting | SQLite, MongoDB, MySQL |
| D4 | Database access | Drizzle ORM + SQL migration files | Stays close to SQL so you learn SQL, fully typed | Raw `pg`, Prisma, Kysely |
| D5 | API style | REST under `/api/v1`, documented with OpenAPI | Most common style, easy to write a contract for | tRPC, GraphQL |
| D6 | Backend framework | Express 5 | Most common in real codebases, minimal, lots of help online | Fastify, Hono, NestJS |
| D7 | Validation | Zod schemas in `shared/` | One schema gives the runtime check, the TS type, and the OpenAPI docs | Joi, hand-written checks |
| D8 | Auth | Our own server-side sessions, httpOnly cookie, argon2id passwords | You learn how auth works; sessions can be killed instantly | Firebase Auth, JWTs, Clerk, Better Auth |
| D9 | Money | Integer cents stored as `bigint`, USD only | No floating point rounding errors | Decimal type, floats (never) |
| D10 | Ledger | Double-entry, append-only, balance cached on the account and verified | Every cent is traceable, reads are fast, correctness is checkable | A single balance column only |
| D11 | IDs | UUIDs for anything that appears in a URL, counting numbers for internal rows | Doesn't reveal how many customers exist or invite guessing | Integers everywhere |
| D12 | Frontend | React + Vite single-page app, React Router, TanStack Query, Tailwind + shadcn/ui | Keeps a clear line between frontend and API | Next.js |
| D13 | Testing | Vitest + Supertest against a real Postgres test database | Money bugs hide in the database layer, so we test the real thing | A mocked database |
| D14 | Hosting | Render (one service: API + frontend files) + Neon Postgres | Same origin means simple cookies; both have free tiers | Vercel + separate API, Railway, Fly.io |
| D15 | Bot protection | Cloudflare Turnstile on signup and login | Public forms attract bots; free | reCAPTCHA, nothing |
| D16 | Finding a recipient | By 10-digit account number in v1 | Email lookup tells strangers who banks with G-Bank; we add it later with protections | Email, phone number |
| D17 | Deploy timing | Deploy in Milestone 0, before there are features | Deployment problems show up early and small instead of all at once at the end | Deploy at the end |
| D18 | TypeScript version | 6.0, not 7.0 | typescript-eslint (ESLint's TypeScript support) only works with TypeScript below 6.1. Revisit when it supports 7 | TypeScript 7.0 without type-aware linting |
| D19 | Load testing | k6, run on your laptop at the end of M3 and in M6, followed by a ledger reconciliation | Proves the money rules hold under pressure and gives a performance baseline. Free Render and Neon tiers are too small to measure our code | No load testing, testing against production |
| D20 | Continuous deployment | A `deploy` job in `ci.yml` that runs on `main` after `check` passes and calls Render's deploy hook; Render auto-deploy off | The whole pipeline from merge to live is in one file you can read and review | Render's built-in "After CI Checks Pass" auto-deploy |
| D21 | Task tracking | One GitHub issue per task; branch names start with the issue number (`feat/9-config`); PR descriptions say `Closes #9` | Merging closes the issue and moves the milestone's progress bar automatically. The same habit as Jira ticket numbers in branch names | Task IDs typed into PR titles, PR numbers alone, Jira |
| D22 | Local checks | Husky + lint-staged: pre-commit fixes and lints staged files, pre-push runs typecheck and tests; `npm run check` runs everything | Problems show up on your laptop in seconds instead of in CI minutes later. CI still blocks merging, because hooks can be skipped | No hooks, Lefthook, simple-git-hooks |
| D23 | Users table timing | The `users` table is created in M1, before auth exists | `accounts.user_id` and `transactions.initiated_by` point at it; tests insert users directly with a placeholder hash until M2 | Fake owner IDs in M1, then a migration to add the foreign keys later |
| D24 | Migrations everywhere | One `npm run db:migrate` command applies migrations and then makes sure the funding account exists; Render's start command runs it before `npm start` | Laptop, test, and Neon databases are set up the same way with one command, and a failed migration stops a deploy before the new server starts | Separate `db:migrate:prod`, seeding by hand, migrations at app startup |
| D25 | Service signature | Services take the database as their first argument: `createDeposit(db, input)` | Tests pass the test database, the app passes the pool built from `DATABASE_URL`, and no module holds a global connection | A global `db` import, a class with a constructor |

## Status

Milestone 0 is done: the API is live on Render with CI/CD. Next: [Milestone 1 step-by-step plan](plans/2026-09-16-m1-database-and-ledger.md) (database and ledger).

Live: https://g-bank.onrender.com/api/v1/health
