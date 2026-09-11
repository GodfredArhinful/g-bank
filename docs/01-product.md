# 1. Product

## 1.1 Vision

G-Bank is a digital bank that lives in the browser. You can open accounts, move money, and always see exactly where every cent went. The money is fake. The engineering is real.

## 1.2 Who uses it

| Person | In v1? | What they can do |
|---|---|---|
| Visitor | Yes | See the landing page, sign up, log in |
| Customer | Yes | Everything in section 1.3 |
| Admin (bank staff) | No, v2 | Freeze accounts, reverse transactions, look up customers |

## 1.3 v1 features

Each feature has an ID (F1, F2...) that the roadmap and tests refer to.

### F1. Sign up
*As a visitor, I want to create an account so I can start banking.*
- Fields: full name (1 to 100 characters), email (valid format, saved in lowercase), password (12 to 128 characters, can't be the same as the email).
- An email can only be used once.
- On success, all of this happens together: the user is created, a checking account is opened, a **$1,000.00 welcome bonus** is credited, the user is logged in, and they land on the dashboard.
- Protected by a Cloudflare Turnstile bot check (added in Milestone 6).

### F2. Log in and log out
*As a customer, I want to log in and out safely.*
- Log in with email and password.
- A wrong email and a wrong password show the same message: "Email or password is incorrect."
- After 5 wrong passwords in a row on one account, that account is locked for 15 minutes.
- Logging out ends the session on the server immediately.

### F3. Automatic logout
*As a customer, I want to be logged out if I walk away from my computer.*
- After 15 minutes without activity, the session ends.
- At 13 minutes, a warning appears with a "Stay signed in" button.
- No session lasts longer than 12 hours, even with activity.

### F4. Dashboard
*As a customer, I want to see all my money at a glance.*
- Every open account: type, nickname, masked number (like `••••1746`), and balance.
- Total balance across all accounts.
- The 5 most recent transactions across all accounts.
- Buttons for Send money, Deposit, and Open account.

### F5. Open an account
- Choose checking or savings, with an optional nickname (up to 30 characters).
- Up to 5 open accounts per customer.
- New accounts start at $0.00 and get a unique 10-digit account number.

### F6. Account details and history
- Balance, type, opened date, and the full account number (hidden until you press "Show").
- Rename the account (change the nickname).
- History, newest first, 20 at a time with a "Load more" button.
- Each row: date, description, amount (with + or -), and the balance after that transaction.

### F7. Simulated deposit
*As a customer, I want to add money so I can try things out.*
- Choose an account and an amount from $0.01 to $10,000.00.
- Shows up as "Deposit" in history. The money comes from G-Bank's internal funding account (see [Database](03-database.md)).

### F8. Transfer between my own accounts
- Pick from and to accounts, an amount, and an optional note (up to 140 characters).
- Review screen, then confirm.
- No daily limit.

### F9. Send money to another customer
*As a customer, I want to pay a friend who also banks with G-Bank.*
- Type the recipient's 10-digit account number. G-Bank shows a shortened name ("Bob S.") so you can check it's the right person.
- Review screen, then confirm.
- You can send up to **$5,000.00 per day** to other customers in total. The limit resets at midnight UTC, and the screen shows how much you have left.
- Clicking "Confirm" twice, or a flaky connection that retries, never sends the money twice.

### F10. Security settings
- Change password. Requires the current password, and signs out every other device.
- A "Sign out of all other devices" button.

### F11. Demo notice
- A banner on every page: "Demo project. Not a real bank. Fake money only."

## 1.4 Business rules (the laws money follows)

These are the rules the code and database must never break. Tests check every one of them.

| # | Rule |
|---|---|
| BR1 | All amounts are whole cents stored as integers. $12.34 is stored as `1234`. |
| BR2 | One transaction moves at least $0.01 and at most $10,000.00. |
| BR3 | A customer account's balance can never go below $0.00. No overdrafts. |
| BR4 | Every transaction is recorded as ledger entries that add up to exactly zero (double-entry). |
| BR5 | Ledger records are never edited or deleted. Mistakes are fixed with a new "reversal" transaction (v2, admin only). |
| BR6 | USD only. |
| BR7 | A customer can have at most 5 open accounts. |
| BR8 | Every new customer gets a $1,000.00 welcome bonus in their first checking account. |
| BR9 | Money sent to other customers is capped at $5,000.00 per customer per UTC day. Transfers between your own accounts and deposits don't count. |
| BR10 | You can't transfer to the same account you're sending from. |
| BR11 | Only accounts with status `active` can send or receive money. |
| BR12 | A customer can only see and use their own accounts. Anyone else's account behaves as if it doesn't exist. |
| BR13 | Repeating a money request with the same idempotency key never moves money twice. |

## 1.5 Out of scope for v1

- Real money, connections to real banks, card payments, identity checks (KYC)
- Debit or credit cards, loans, bill pay, scheduled payments, multiple currencies
- Admin console and reversals
- Any email (verification, password reset, notifications)
- Two-factor login
- Native iPhone or Android apps (the website is mobile-friendly instead)

## 1.6 Stretch backlog (after v1)

Rough priority order. Each one is a self-contained learning project.

1. **Demo login button** so visitors can try a pre-filled account without signing up
2. **Two-factor login** with an authenticator app (TOTP)
3. **Active sessions list** to see and sign out each device
4. **Email verification and password reset** (Resend free tier)
5. **Send money by email**, with protections against people fishing for who has an account
6. **Interest on savings** (a scheduled monthly job)
7. **CSV export** of history
8. **Recurring transfers**
9. **Admin console**: freeze accounts, reverse transactions
10. **Sign in with Google** (OAuth)
11. **Dark mode**
12. **End-to-end tests** with Playwright

## Check yourself

1. Alice has $30 in checking and sends $25 to Bob twice, a second apart, as two separate transfers. Which business rules decide what happens to the second one?
2. Why doesn't moving money between your own accounts count toward the daily limit? Think about what the limit protects against.
