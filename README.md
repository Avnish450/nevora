# Nevora — P2P USDT/INR Marketplace Demo

A working demo of a P2P cryptocurrency marketplace with escrow, built with fake money only.

**This demo proves one thing:** a buyer and a seller can complete a trade safely while the platform locks and releases the seller's USDT.

No blockchain, no real payments, no real KYC.

---

## ⚠️ Known Limits

This is a **demo with fake money**. It has no real authentication, no blockchain, no KYC, and no fraud controls. It must **not** be connected to real funds or deployed publicly without a security review and legal advice.

---

## Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **PostgreSQL 16** (via Homebrew or Docker)

### Option A: PostgreSQL via Homebrew (macOS)

```bash
brew install postgresql@16
brew services start postgresql@16
export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"

# Create dev and test databases
createdb nevora
createdb nevora_test
```

### Option B: PostgreSQL via Docker

```bash
docker compose up -d
```

### Setup & Run

```bash
# 1. Install dependencies
npm install

# 2. Copy environment file (if not already present)
cp .env.example .env.local
# Edit .env.local if your PostgreSQL credentials differ

# 3. Run migrations
npm run migrate

# 4. Seed demo data
npm run seed

# 5. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Running Tests

```bash
# Ensure the test database exists and migrate it
npm run migrate:test

# Run tests
npm test
```

---

## Demo Users

| User  | Role   | Starting Balance |
| ----- | ------ | --------------- |
| Alice | Seller | 1,000 USDT      |
| Bob   | Buyer  | 0 USDT          |
| Admin | Admin  | 0 USDT          |

Use the **user switcher** in the top right to switch between users.

---

## Demo Walkthrough

1. **Switch to Alice** → go to Wallet → she already has 1,000 USDT from the faucet
2. **Switch to Alice** → go to Marketplace → she has an ad at ₹88.00/USDT
3. **Switch to Bob** → go to Wallet → use the faucet to get some USDT (optional)
4. **Switch to Bob** → go to Marketplace → click "Buy" on Alice's ad → enter amount → create order
5. Alice's USDT is now **locked** in escrow
6. **Bob** clicks "I've Paid" (simulating an INR bank transfer)
7. **Switch to Alice** → go to My Orders → click the order → click "Release"
8. Bob now has the USDT. Check the **Ledger** page to see every balance change.

### Other Paths

- **Cancel:** Bob can cancel a CREATED order → USDT unlocks back to Alice
- **Expiry:** If Bob doesn't pay within 2 minutes (demo mode), the order expires → USDT unlocks
- **Dispute:** Either party can dispute a PAID order → Admin resolves it
- **Withdrawal:** Bob can simulate a withdrawal to a fake blockchain address

---

## Architecture

```
├── migrations/          SQL migration files
├── scripts/             CLI scripts (migrate, seed, reset)
├── src/
│   ├── app/             Next.js App Router pages & API routes
│   │   ├── api/         REST API endpoints
│   │   └── ...          UI pages
│   └── lib/             Shared library code
│       ├── db.ts        Database connection pool
│       ├── money.ts     Money utilities (bigint only)
│       ├── config.ts    Application config
│       └── services/    Business logic (ledger, orders, etc.)
├── tests/               Vitest test files
├── docker-compose.yml   PostgreSQL containers
└── vitest.config.ts     Test configuration
```

## Money Rules

- All amounts are stored as **bigint** (never floating point)
- USDT: 6 decimals → 1 USDT = 1,000,000 units
- INR: 2 decimals → 1 INR = 100 paise
- Ledger entries are **immutable** (enforced by database trigger)
- Every journal's entries sum to **exactly zero**
- No user account balance may go **below zero** (enforced by CHECK constraint)

## Tech Stack

| Layer     | Choice                                       |
| --------- | -------------------------------------------- |
| Language  | TypeScript throughout                        |
| App       | Next.js (App Router) with API route handlers |
| Database  | PostgreSQL 16                                |
| DB Access | `pg` with plain SQL (no ORM)                 |
| Tests     | Vitest against a real test database           |
| Styling   | Tailwind CSS                                 |

---

## License

Demo only. Not for production use.
