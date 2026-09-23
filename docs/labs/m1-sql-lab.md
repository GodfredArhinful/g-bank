# M1 SQL lab: talk to Postgres by hand

Before Drizzle writes SQL for you, you write some yourself. Everything G-Bank does with money is one of the ideas below: tables, rows, constraints, joins, `GROUP BY`, and transactions. About 45 minutes.

**Setup.** Postgres.app is running (Task 1 of the [M1 plan](../plans/2026-09-16-m1-database-and-ledger.md)). Use a throwaway database so nothing here touches `gbank_dev`:

```bash
createdb gbank_lab && psql gbank_lab
```

You're now inside `psql`. The prompt is `gbank_lab=#`. Rules of the road:

- Every SQL statement ends with `;`. If you press Enter and nothing happens, you forgot it (the prompt shows `gbank_lab-#` while it waits).
- Commands starting with `\` are psql's own, not SQL: `\dt` lists tables, `\d pets` describes one, `\q` quits.
- Up arrow recalls the previous line. `Ctrl+C` abandons a half-typed statement.

Write your observations in the **My notes** section at the bottom as you go. That section is the deliverable for Task 1.

---

## 1. Two tables with a relationship

A `pets` row points at the `owners` row it belongs to. That pointer is a **foreign key**.

```sql
CREATE TABLE owners (
  id serial PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL UNIQUE
);

CREATE TABLE pets (
  id serial PRIMARY KEY,
  owner_id integer NOT NULL REFERENCES owners (id),
  name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('dog', 'cat', 'fish')),
  weight_kg numeric CHECK (weight_kg > 0)
);
```

Then look at what you made:

```sql
\dt
\d pets
```

**Q1.** In the `\d pets` output, find the section listing constraints. How many are there, and what is each one protecting against?

## 2. Insert rows

```sql
INSERT INTO owners (name, email) VALUES ('Alice', 'alice@example.com'), ('Bob', 'bob@example.com');

INSERT INTO pets (owner_id, name, kind, weight_kg) VALUES
  (1, 'Rex', 'dog', 30),
  (1, 'Tom', 'cat', 4.5),
  (2, 'Nemo', 'fish', 0.1),
  (2, 'Bella', 'dog', 22);
```

Postgres answers `INSERT 0 4`. The `4` is the number of rows written.

## 3. Read rows

```sql
SELECT * FROM pets;
SELECT name, kind FROM pets WHERE kind = 'dog' ORDER BY name;
SELECT name FROM pets WHERE weight_kg > 10;
```

**Q2.** Predict the row count of each query before you press Enter. Were you right?

## 4. Change a row

```sql
UPDATE pets SET weight_kg = 31 WHERE name = 'Rex';
SELECT name, weight_kg FROM pets WHERE name = 'Rex';
```

Now run the same `UPDATE` **without** the `WHERE`. Don't worry, it's a lab:

```sql
UPDATE pets SET weight_kg = 31;
SELECT name, weight_kg FROM pets;
```

**Q3.** What did the `WHERE` protect you from? This is why G-Bank's ledger tables will refuse `UPDATE` entirely (Task 3).

## 5. Join two tables

Each pet knows its `owner_id`. A `JOIN` follows that pointer so one result row can show columns from both tables:

```sql
SELECT o.name AS owner, p.name AS pet, p.kind
FROM pets p
JOIN owners o ON o.id = p.owner_id
ORDER BY owner, pet;
```

`p` and `o` are nicknames (aliases) for the tables, so you don't retype the full names.

## 6. Group and count

```sql
SELECT o.name AS owner, COUNT(*) AS pets, SUM(p.weight_kg) AS total_kg
FROM pets p
JOIN owners o ON o.id = p.owner_id
GROUP BY o.name
ORDER BY owner;
```

`GROUP BY` folds many rows into one per owner, and `COUNT` / `SUM` say what to do with the folded rows. G-Bank's reconciliation check "every transaction's entries add up to zero" is exactly this shape, with `HAVING` added:

```sql
SELECT o.name, SUM(p.weight_kg) AS total_kg
FROM pets p
JOIN owners o ON o.id = p.owner_id
GROUP BY o.name
HAVING SUM(p.weight_kg) > 30;
```

**Q4.** `WHERE` filters rows before grouping and `HAVING` filters groups after. Rewrite the last query in your head with `WHERE` instead of `HAVING`. Why doesn't that work?

## 7. Watch the database say no

Run each of these on its own and **read the error message carefully**. Each names the constraint that fired.

```sql
INSERT INTO pets (owner_id, name, kind) VALUES (1, 'Smaug', 'dragon');
INSERT INTO owners (name, email) VALUES ('Alice again', 'alice@example.com');
INSERT INTO pets (owner_id, name, kind) VALUES (999, 'Ghost', 'cat');
INSERT INTO pets (owner_id, name, kind, weight_kg) VALUES (1, 'Air', 'cat', -1);
```

**Q5.** For each of the four, write down: which constraint fired (its name from the message), and which of these words describes it: CHECK, UNIQUE, FOREIGN KEY. In G-Bank, "a customer account can't go below zero" will be a CHECK, and "two accounts can't share a number" will be UNIQUE.

## 8. Transactions: all or nothing

```sql
BEGIN;
DELETE FROM pets;
SELECT COUNT(*) FROM pets;
ROLLBACK;
SELECT COUNT(*) FROM pets;
```

**Q6.** What did the two counts show? Explain in one sentence what `ROLLBACK` did.

Now the other ending:

```sql
BEGIN;
UPDATE pets SET name = 'Rex II' WHERE name = 'Rex';
UPDATE pets SET name = 'Bella II' WHERE name = 'Bella';
COMMIT;
SELECT name FROM pets ORDER BY name;
```

Between `BEGIN` and `COMMIT`, nobody else can see the half-done work. That's the property G-Bank leans on: a transfer writes a transaction row, two entries, and two balance updates, and either all five land or none do.

## 9. Two terminals: locks

This one previews the most important idea in Milestone 3. Open a **second** terminal tab and run `psql gbank_lab` there too. Keep both visible.

Terminal A:

```sql
BEGIN;
SELECT * FROM owners WHERE id = 1 FOR UPDATE;
```

Terminal B:

```sql
UPDATE owners SET name = 'Alice B' WHERE id = 1;
```

Terminal B **hangs**. It's waiting. Now in terminal A:

```sql
COMMIT;
```

Watch terminal B finish the instant A commits.

**Q7.** `FOR UPDATE` put a lock on Alice's row. In G-Bank, what would go wrong if two transfers from the same account ran at the same moment with no lock? (Hint: both read the balance before either writes.)

Quit the second terminal's psql with `\q`.

## 10. A tiny ledger

The real thing in miniature: a table of money movements where each transaction's lines must add up to zero.

```sql
CREATE TABLE ledger (
  id serial PRIMARY KEY,
  tx integer NOT NULL,
  account text NOT NULL,
  amount_cents bigint NOT NULL CHECK (amount_cents <> 0)
);

BEGIN;
INSERT INTO ledger (tx, account, amount_cents) VALUES (1, 'funding', -10000), (1, 'alice', 10000);
INSERT INTO ledger (tx, account, amount_cents) VALUES (2, 'alice', -2500), (2, 'bob', 2500);
COMMIT;

SELECT account, SUM(amount_cents) AS balance_cents FROM ledger GROUP BY account ORDER BY account;
SELECT SUM(amount_cents) AS total FROM ledger;
```

Now plant a broken transaction, then write the query that finds it:

```sql
INSERT INTO ledger (tx, account, amount_cents) VALUES (3, 'bob', -700);

SELECT tx, SUM(amount_cents) AS total
FROM ledger
GROUP BY tx
HAVING SUM(amount_cents) <> 0;
```

**Q8.** Why is the funding account's balance negative, and why is that fine? (Same as Check yourself question 1 in [03-database.md](../03-database.md).)

## 11. Clean up

```sql
\q
```

```bash
dropdb gbank_lab
```

`gbank_dev` and `gbank_test` are untouched and ready for Task 2.

---

## My notes

Written up by Claude from the session on 2026-09-22. G ran every exercise in `psql` (with a few detours into the wrong prompt, see the last item); the outputs below are what actually came back.

- **Q1** (constraints on `pets`): three, plus the primary key. `pets_kind_check` only allows dog, cat, or fish. `pets_weight_kg_check` refuses a weight of 0 or less. `pets_owner_id_fkey` refuses an `owner_id` that doesn't exist in `owners`. Postgres invented the names; in G-Bank we'll name ours.
- **Q2** (predicted vs actual counts): 4 rows, 2 dogs (Bella, Rex), 2 pets over 10 kg (Rex 30, Bella 22).
- **Q3** (what `WHERE` protected): with `WHERE name = 'Rex'` the reply was `UPDATE 1`. Without it, `UPDATE 4`, and the fish weighed 31 kg. The `WHERE` is the only thing that limits a change to the rows you meant. That's why G-Bank's ledger tables will refuse `UPDATE` entirely (Task 3).
- **Q4** (`WHERE` vs `HAVING`): `WHERE` filters rows before they're grouped, so it can't see a `SUM`. `HAVING` filters after grouping, once each group's sum exists.
- **Q5** (the four errors, constraint name and kind): `pets_kind_check` (CHECK) for the dragon; `owners_email_key` (UNIQUE) for the second alice@example.com; `pets_owner_id_fkey` (FOREIGN KEY) for owner 999; `pets_weight_kg_check` (CHECK) for -1 kg. Each error names the constraint and shows the failing row.
- **Q6** (`ROLLBACK`): inside `BEGIN`, the count after `DELETE` was 0; after `ROLLBACK` it was 4 again. The delete never became real: a transaction is a draft that only becomes permanent on `COMMIT`. The property is atomicity, the A in ACID.
- **Q7** (two transfers, no lock): both would read the same balance, both would see enough money, and both would write, so the account could go negative or the second write would overwrite the first. `FOR UPDATE` made terminal B wait until terminal A committed, so the second transfer sees the balance the first one left behind. A race becomes a queue.
- **Q8** (negative funding balance): funding sits at -10000 because every deposit is written as "funding gives, customer receives". Its negative balance is exactly how much fake money the bank has issued, and the total across all accounts stays 0. System accounts are the only ones allowed below zero. Planting a one-sided transaction (tx 3, -700) and running the `GROUP BY tx HAVING SUM(amount_cents) <> 0` query found it in one row.
- **Something that surprised me:** how much time went to the prompt itself. `%` means the shell, `gbank_lab=#` means psql, and `gbank_lab-#` or `gbank_lab(#` means psql is still waiting for a `;`. Typing `clear` into psql piled up into one unfinished statement until Ctrl+C. Database names use underscores, not hyphens: `gbank_lab`, not `gbank-lab`.
