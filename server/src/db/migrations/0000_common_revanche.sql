CREATE TYPE "public"."account_status" AS ENUM('active', 'frozen', 'closed');--> statement-breakpoint
CREATE TYPE "public"."account_type" AS ENUM('checking', 'savings', 'system');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('welcome_bonus', 'deposit', 'internal_transfer', 'p2p_transfer', 'reversal');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"account_number" text NOT NULL,
	"type" "account_type" NOT NULL,
	"status" "account_status" DEFAULT 'active' NOT NULL,
	"nickname" text,
	"currency" text DEFAULT 'USD' NOT NULL,
	"balance_cents" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	CONSTRAINT "accounts_account_number_format" CHECK ("accounts"."account_number" ~ '^[0-9]{10}$'),
	CONSTRAINT "accounts_nickname_length" CHECK (char_length("accounts"."nickname") <= 30),
	CONSTRAINT "accounts_currency_usd" CHECK ("accounts"."currency" = 'USD'),
	CONSTRAINT "accounts_system_has_no_owner" CHECK (("accounts"."type" = 'system') = ("accounts"."user_id" IS NULL)),
	CONSTRAINT "accounts_balance_non_negative" CHECK ("accounts"."type" = 'system' OR "accounts"."balance_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "entries" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "entries_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"transaction_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"amount_cents" bigint NOT NULL,
	"balance_after_cents" bigint NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "entries_amount_not_zero" CHECK ("entries"."amount_cents" <> 0)
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "transaction_type" NOT NULL,
	"initiated_by" uuid,
	"note" text,
	"reverses_id" uuid,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "transactions_note_length" CHECK (char_length("transactions"."note") <= 140)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"full_name" text NOT NULL,
	"password_hash" text NOT NULL,
	"failed_login_count" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_full_name_length" CHECK (char_length("users"."full_name") BETWEEN 1 AND 100)
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entries" ADD CONSTRAINT "entries_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entries" ADD CONSTRAINT "entries_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_initiated_by_users_id_fk" FOREIGN KEY ("initiated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_reverses_id_transactions_id_fk" FOREIGN KEY ("reverses_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_account_number_unique" ON "accounts" USING btree ("account_number");--> statement-breakpoint
CREATE INDEX "accounts_user_id_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "entries_account_history_idx" ON "entries" USING btree ("account_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "entries_transaction_id_idx" ON "entries" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "transactions_initiated_by_type_created_at_idx" ON "transactions" USING btree ("initiated_by","type","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");