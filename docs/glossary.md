# Glossary

Every technical term used in these docs, in plain words.

| Term | Meaning |
|---|---|
| **ACID** | The four guarantees of a database transaction: Atomic (all or nothing), Consistent (rules always hold), Isolated (concurrent work doesn't interfere), Durable (once committed, it survives a crash) |
| **API** | The set of URLs the frontend (or anything else) calls to talk to the backend |
| **API contract** | The written agreement for each endpoint: what goes in, what comes out, and what errors are possible |
| **argon2id** | A password hashing algorithm designed to be slow and memory-hungry, so guessing passwords is expensive |
| **Authentication** | Proving who you are (logging in) |
| **Authorization** | Deciding what you're allowed to do (can you see this account?) |
| **bigint** | A Postgres whole-number type big enough for any amount of cents we'll ever need |
| **Cached balance** | `accounts.balance_cents`: a stored copy of the sum of an account's entries, kept for speed and safety checks |
| **CHECK constraint** | A rule the database enforces on every row, like `balance_cents >= 0` |
| **CI (continuous integration)** | A service that runs your lint, tests, and build on every push, automatically |
| **Cookie** | A small value a website asks the browser to store and send back on every request to that site |
| **CORS** | Browser rules for when a page on one site may call an API on a different site. We avoid needing it by using one origin |
| **CSP (Content Security Policy)** | A header telling the browser which scripts it may run. Limits the damage of XSS |
| **CSRF (cross-site request forgery)** | Another site tricking your browser into sending a request to G-Bank with your cookie attached |
| **Cursor pagination** | Getting "the next N items after this exact one" instead of "page 3." Stays correct when new items arrive. Also called keyset pagination |
| **Database transaction** | A `BEGIN ... COMMIT` block. Everything inside happens completely or not at all. Not the same as a G-Bank transaction |
| **Deadlock** | Two database transactions each waiting for a lock the other holds, forever. Postgres breaks it by cancelling one |
| **Double-entry bookkeeping** | Recording every money movement as entries that add up to zero: money out of one place, the same money into another |
| **Drizzle** | The TypeScript library we use to define tables and write type-checked queries |
| **Endpoint** | One URL + method in the API, like `POST /api/v1/transfers` |
| **Entry** | One line of the ledger: "this account changed by this many cents in this transaction" |
| **Enumeration** | An attacker discovering which emails or account numbers exist by watching how the app responds |
| **Express** | The Node.js framework that handles HTTP requests for our API |
| **Foreign key (FK)** | A column that must point at an existing row in another table |
| **Funding account** | G-Bank's internal system account where deposits and bonuses come from. Its balance is negative |
| **G-Bank transaction** | A row in the `transactions` table: one money event like a deposit or transfer |
| **Hash** | A one-way scramble of data. Easy to compute, practically impossible to reverse |
| **helmet** | Express middleware that sets a bundle of security headers |
| **HttpOnly** | A cookie setting that hides the cookie from JavaScript |
| **Idempotency** | Doing something twice has the same effect as doing it once |
| **Idempotency key** | A unique ID the client sends with a request so the server can recognize a retry and not repeat it |
| **IDOR** | Insecure Direct Object Reference: changing an ID in a request and getting someone else's data |
| **Index** | A database structure that makes finding rows fast, like the index at the back of a book |
| **Isolation level** | How much concurrent database transactions can see of each other's unfinished work |
| **JWT** | JSON Web Token: a signed token the server trusts without looking anything up. Hard to cancel before it expires |
| **Ledger** | The complete, append-only history of every money movement. The source of truth for balances |
| **Middleware** | A function that runs on requests before (or after) the route handler, like logging or checking the session |
| **Migration** | A SQL file that changes the database structure by one step. Committed to git and applied in order |
| **Monorepo** | One git repository holding several related projects (for us: server, web, shared) |
| **Neon** | A hosted Postgres service with a free tier |
| **npm workspaces** | npm's built-in support for several packages in one repo |
| **OpenAPI** | The industry-standard format for describing a REST API. Tools turn it into interactive docs |
| **ORM** | Object-Relational Mapper: a library that lets you work with database rows as objects in code |
| **Origin** | Scheme + domain + port, like `https://g-bank.onrender.com`. Browsers send it as a header |
| **p2p** | Person to person: sending money to another customer |
| **PostgreSQL (Postgres)** | The relational database we use |
| **Primary key (PK)** | The column that uniquely identifies each row |
| **Rate limiting** | Capping how many requests someone can make in a time window |
| **Reconciliation** | Checking that two records of the same truth agree (cached balances vs. ledger entries) |
| **Render** | The hosting service that runs our Node.js server |
| **REST** | An API style built from URLs (nouns) and HTTP methods (verbs) |
| **Row lock** | `SELECT ... FOR UPDATE`: marks rows so other database transactions wanting them must wait |
| **Salt** | Random data mixed into a password before hashing, so identical passwords get different hashes |
| **SameSite** | A cookie setting that controls whether the cookie is sent on requests coming from other sites |
| **Session** | A server-side record that a particular browser is logged in as a particular user |
| **SPA (single-page app)** | A web app that loads once and then updates the page with JavaScript instead of loading new pages |
| **SQL injection** | Tricking an app into running attacker-written SQL by putting it inside user input |
| **Supertest** | A library for sending HTTP requests to an Express app inside tests |
| **TanStack Query** | A React library that fetches, caches, and refreshes server data |
| **Timing attack** | Learning secrets from how long the server takes to respond |
| **Turnstile** | Cloudflare's free, mostly invisible bot check (a CAPTCHA replacement) |
| **Type stripping** | Node.js running TypeScript by deleting the type annotations, with no separate build step |
| **UUID** | A random 128-bit ID like `0f8e6b2a-3c4d-4e5f-8a9b-1c2d3e4f5a6b`. Practically impossible to guess |
| **Validation** | Checking input matches the expected shape and rules before using it |
| **Vitest** | The test runner we use |
| **XSS (cross-site scripting)** | Getting attacker-written JavaScript to run on G-Bank's pages |
| **Zod** | A TypeScript library for describing data shapes once and using them for validation and types |
