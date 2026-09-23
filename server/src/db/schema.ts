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
