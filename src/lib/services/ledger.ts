/**
 * Ledger service — the core financial operations.
 *
 * Every balance change goes through this service, which:
 * 1. Creates a journal entry with metadata
 * 2. Creates double-entry ledger entries that sum to zero
 * 3. Updates cached account balances
 * 4. All within a single database transaction
 *
 * Rules:
 * - Never update or delete ledger_entries rows
 * - Corrections are new reversing entries
 * - No user account (available or locked) may go below zero
 * - System account may go negative
 */

import { PoolClient } from "pg";

export interface LedgerEntry {
  accountId: number;
  amount: bigint;
}

export interface JournalResult {
  journalId: number;
  entries: { id: number; accountId: number; amount: bigint }[];
}

/**
 * Create a journal with ledger entries.
 * All entries must sum to exactly zero.
 * Each account's balance is updated atomically.
 *
 * The caller must provide the PoolClient (for transaction control).
 */
export async function createJournal(
  client: PoolClient,
  type: string,
  referenceType: string | null,
  referenceId: number | null,
  entries: LedgerEntry[]
): Promise<JournalResult> {
  // Validate: entries must sum to zero
  const sum = entries.reduce((acc, e) => acc + e.amount, 0n);
  if (sum !== 0n) {
    throw new Error(
      `Ledger entries must sum to zero, got ${sum.toString()}`
    );
  }

  if (entries.length === 0) {
    throw new Error("Journal must have at least one entry");
  }

  // Create journal
  const { rows: [journal] } = await client.query(
    `INSERT INTO journals (type, reference_type, reference_id)
     VALUES ($1, $2, $3) RETURNING id`,
    [type, referenceType, referenceId]
  );

  // Create entries and update balances
  const createdEntries: { id: number; accountId: number; amount: bigint }[] = [];

  for (const entry of entries) {
    // Lock the account row and update balance atomically
    // The CHECK constraint on accounts will reject negative balances
    // for non-system accounts.
    const { rows: updated } = await client.query(
      `UPDATE accounts
       SET balance = balance + $1
       WHERE id = $2
       RETURNING id, balance`,
      [entry.amount.toString(), entry.accountId]
    );

    if (updated.length === 0) {
      throw new Error(`Account ${entry.accountId} not found`);
    }

    // Insert the ledger entry
    const { rows: [ledgerEntry] } = await client.query(
      `INSERT INTO ledger_entries (journal_id, account_id, amount)
       VALUES ($1, $2, $3) RETURNING id`,
      [journal.id, entry.accountId, entry.amount.toString()]
    );

    createdEntries.push({
      id: ledgerEntry.id,
      accountId: entry.accountId,
      amount: entry.amount,
    });
  }

  return {
    journalId: journal.id,
    entries: createdEntries,
  };
}

/**
 * Faucet: credit fake USDT to a user.
 *
 * Entries:
 *   system account  −amount
 *   user available  +amount
 */
export async function faucetCredit(
  client: PoolClient,
  userId: number,
  amount: bigint
): Promise<JournalResult> {
  if (amount <= 0n) {
    throw new Error("Faucet amount must be positive");
  }

  const systemAccount = await getAccountId(client, null, "USDT", "system");
  const userAvailable = await getAccountId(client, userId, "USDT", "available");

  return createJournal(client, "faucet", "user", userId, [
    { accountId: systemAccount, amount: -amount },
    { accountId: userAvailable, amount: amount },
  ]);
}

/**
 * Lock: move USDT from seller's available to seller's locked.
 *
 * Entries:
 *   seller available  −amount
 *   seller locked     +amount
 */
export async function lockFunds(
  client: PoolClient,
  sellerId: number,
  amount: bigint,
  referenceType: string,
  referenceId: number
): Promise<JournalResult> {
  if (amount <= 0n) {
    throw new Error("Lock amount must be positive");
  }

  const sellerAvailable = await getAccountId(client, sellerId, "USDT", "available");
  const sellerLocked = await getAccountId(client, sellerId, "USDT", "locked");

  return createJournal(client, "lock", referenceType, referenceId, [
    { accountId: sellerAvailable, amount: -amount },
    { accountId: sellerLocked, amount: amount },
  ]);
}

/**
 * Unlock: move USDT from seller's locked back to available.
 * Used for cancellation, expiry, or admin refund.
 *
 * Entries:
 *   seller locked     −amount
 *   seller available  +amount
 */
export async function unlockFunds(
  client: PoolClient,
  sellerId: number,
  amount: bigint,
  referenceType: string,
  referenceId: number
): Promise<JournalResult> {
  if (amount <= 0n) {
    throw new Error("Unlock amount must be positive");
  }

  const sellerLocked = await getAccountId(client, sellerId, "USDT", "locked");
  const sellerAvailable = await getAccountId(client, sellerId, "USDT", "available");

  return createJournal(client, "unlock", referenceType, referenceId, [
    { accountId: sellerLocked, amount: -amount },
    { accountId: sellerAvailable, amount: amount },
  ]);
}

/**
 * Release: move USDT from seller's locked to buyer's available.
 *
 * Entries:
 *   seller locked    −amount
 *   buyer available  +amount
 */
export async function releaseFunds(
  client: PoolClient,
  sellerId: number,
  buyerId: number,
  amount: bigint,
  referenceType: string,
  referenceId: number
): Promise<JournalResult> {
  if (amount <= 0n) {
    throw new Error("Release amount must be positive");
  }

  const sellerLocked = await getAccountId(client, sellerId, "USDT", "locked");
  const buyerAvailable = await getAccountId(client, buyerId, "USDT", "available");

  return createJournal(client, "release", referenceType, referenceId, [
    { accountId: sellerLocked, amount: -amount },
    { accountId: buyerAvailable, amount: amount },
  ]);
}

/**
 * Withdrawal (simulated): debit USDT from user's available.
 *
 * Entries:
 *   user available   −amount
 *   system account   +amount
 */
export async function withdrawal(
  client: PoolClient,
  userId: number,
  amount: bigint
): Promise<JournalResult> {
  if (amount <= 0n) {
    throw new Error("Withdrawal amount must be positive");
  }

  const userAvailable = await getAccountId(client, userId, "USDT", "available");
  const systemAccount = await getAccountId(client, null, "USDT", "system");

  return createJournal(client, "withdrawal", "user", userId, [
    { accountId: userAvailable, amount: -amount },
    { accountId: systemAccount, amount: amount },
  ]);
}

/**
 * Get the account ID for a user/asset/kind combination.
 */
export async function getAccountId(
  client: PoolClient,
  userId: number | null,
  asset: string,
  kind: string
): Promise<number> {
  const { rows } = userId === null
    ? await client.query(
        `SELECT id FROM accounts WHERE user_id IS NULL AND asset = $1 AND kind = $2`,
        [asset, kind]
      )
    : await client.query(
        `SELECT id FROM accounts WHERE user_id = $1 AND asset = $2 AND kind = $3`,
        [userId, asset, kind]
      );

  if (rows.length === 0) {
    throw new Error(
      `Account not found: user=${userId}, asset=${asset}, kind=${kind}`
    );
  }
  return rows[0].id;
}

/**
 * Get all account balances for a user.
 */
export async function getUserBalances(
  client: PoolClient,
  userId: number
): Promise<{ available: bigint; locked: bigint }> {
  const { rows } = await client.query(
    `SELECT kind, balance FROM accounts WHERE user_id = $1 AND asset = 'USDT'`,
    [userId]
  );

  let available = 0n;
  let locked = 0n;

  for (const row of rows) {
    const bal = BigInt(row.balance);
    if (row.kind === "available") available = bal;
    if (row.kind === "locked") locked = bal;
  }

  return { available, locked };
}

/**
 * Reconciliation: verify that every account's cached balance
 * matches the sum of its ledger entries.
 *
 * Returns an array of discrepancies (empty = all good).
 */
export async function reconcile(
  client: PoolClient
): Promise<{ accountId: number; cachedBalance: bigint; computedBalance: bigint }[]> {
  const { rows } = await client.query(`
    SELECT
      a.id AS account_id,
      a.balance AS cached_balance,
      COALESCE(SUM(le.amount), 0) AS computed_balance
    FROM accounts a
    LEFT JOIN ledger_entries le ON le.account_id = a.id
    GROUP BY a.id
    HAVING a.balance != COALESCE(SUM(le.amount), 0)
  `);

  return rows.map((r: { account_id: number; cached_balance: string; computed_balance: string }) => ({
    accountId: r.account_id,
    cachedBalance: BigInt(r.cached_balance),
    computedBalance: BigInt(r.computed_balance),
  }));
}

/**
 * Get ledger entries for a specific user, ordered by time.
 */
export async function getUserLedgerEntries(
  client: PoolClient,
  userId: number
): Promise<{
  id: number;
  journalId: number;
  journalType: string;
  accountKind: string;
  amount: bigint;
  createdAt: Date;
}[]> {
  const { rows } = await client.query(
    `SELECT
       le.id,
       le.journal_id,
       j.type AS journal_type,
       a.kind AS account_kind,
       le.amount,
       le.created_at
     FROM ledger_entries le
     JOIN accounts a ON a.id = le.account_id
     JOIN journals j ON j.id = le.journal_id
     WHERE a.user_id = $1
     ORDER BY le.created_at ASC, le.id ASC`,
    [userId]
  );

  return rows.map((r: {
    id: number;
    journal_id: number;
    journal_type: string;
    account_kind: string;
    amount: string;
    created_at: Date;
  }) => ({
    id: r.id,
    journalId: r.journal_id,
    journalType: r.journal_type,
    accountKind: r.account_kind,
    amount: BigInt(r.amount),
    createdAt: r.created_at,
  }));
}
