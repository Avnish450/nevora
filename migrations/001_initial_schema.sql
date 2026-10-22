-- 001_initial_schema.sql
-- Core tables for Nevora P2P marketplace

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE users (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  role       TEXT NOT NULL CHECK (role IN ('seller', 'buyer', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ACCOUNTS
-- ============================================================
-- One row per user per (asset, kind) bucket.
-- user_id NULL = system account.
CREATE TABLE accounts (
  id       SERIAL PRIMARY KEY,
  user_id  INT REFERENCES users(id),
  asset    TEXT NOT NULL CHECK (asset IN ('USDT')),
  kind     TEXT NOT NULL CHECK (kind IN ('available', 'locked', 'system')),
  balance  BIGINT NOT NULL DEFAULT 0,
  UNIQUE (user_id, asset, kind),
  CONSTRAINT balance_non_negative CHECK (
    kind = 'system' OR balance >= 0
  )
);

-- System account: user_id IS NULL, kind = 'system'
-- Allow only one system account per asset
CREATE UNIQUE INDEX accounts_system_unique
  ON accounts (asset) WHERE user_id IS NULL AND kind = 'system';

-- ============================================================
-- JOURNALS
-- ============================================================
CREATE TABLE journals (
  id              SERIAL PRIMARY KEY,
  type            TEXT NOT NULL,
  reference_type  TEXT,
  reference_id    INT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- LEDGER ENTRIES
-- ============================================================
CREATE TABLE ledger_entries (
  id          SERIAL PRIMARY KEY,
  journal_id  INT NOT NULL REFERENCES journals(id),
  account_id  INT NOT NULL REFERENCES accounts(id),
  amount      BIGINT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ledger_entries_journal_id ON ledger_entries(journal_id);
CREATE INDEX ledger_entries_account_id ON ledger_entries(account_id);

-- Immutability trigger: reject UPDATE and DELETE on ledger_entries
CREATE OR REPLACE FUNCTION reject_ledger_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'ledger_entries rows are immutable: % is not allowed', TG_OP;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ledger_entries_immutable_update
  BEFORE UPDATE ON ledger_entries
  FOR EACH ROW EXECUTE FUNCTION reject_ledger_mutation();

CREATE TRIGGER ledger_entries_immutable_delete
  BEFORE DELETE ON ledger_entries
  FOR EACH ROW EXECUTE FUNCTION reject_ledger_mutation();

-- ============================================================
-- ADS
-- ============================================================
CREATE TABLE ads (
  id                SERIAL PRIMARY KEY,
  seller_id         INT NOT NULL REFERENCES users(id),
  price_inr_paise   BIGINT NOT NULL CHECK (price_inr_paise > 0),
  total_usdt        BIGINT NOT NULL CHECK (total_usdt > 0),
  remaining_usdt    BIGINT NOT NULL CHECK (remaining_usdt >= 0),
  min_usdt          BIGINT NOT NULL CHECK (min_usdt > 0),
  max_usdt          BIGINT NOT NULL CHECK (max_usdt > 0),
  payment_method    TEXT NOT NULL,
  payment_details   TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT min_lte_max CHECK (min_usdt <= max_usdt),
  CONSTRAINT max_lte_total CHECK (max_usdt <= total_usdt)
);

-- ============================================================
-- ORDERS
-- ============================================================
CREATE TABLE orders (
  id               SERIAL PRIMARY KEY,
  ad_id            INT NOT NULL REFERENCES ads(id),
  buyer_id         INT NOT NULL REFERENCES users(id),
  seller_id        INT NOT NULL REFERENCES users(id),
  usdt_amount      BIGINT NOT NULL CHECK (usdt_amount > 0),
  price_inr_paise  BIGINT NOT NULL CHECK (price_inr_paise > 0),
  total_inr_paise  BIGINT NOT NULL CHECK (total_inr_paise > 0),
  state            TEXT NOT NULL DEFAULT 'CREATED'
    CHECK (state IN (
      'CREATED', 'PAID', 'CANCELLED', 'EXPIRED',
      'RELEASED', 'DISPUTED', 'RESOLVED_RELEASED', 'RESOLVED_REFUNDED'
    )),
  expires_at       TIMESTAMPTZ NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT buyer_ne_seller CHECK (buyer_id != seller_id)
);

-- ============================================================
-- ORDER EVENTS
-- ============================================================
CREATE TABLE order_events (
  id          SERIAL PRIMARY KEY,
  order_id    INT NOT NULL REFERENCES orders(id),
  from_state  TEXT,
  to_state    TEXT NOT NULL,
  actor_id    INT REFERENCES users(id),
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX order_events_order_id ON order_events(order_id);

-- ============================================================
-- DISPUTES
-- ============================================================
CREATE TABLE disputes (
  id           SERIAL PRIMARY KEY,
  order_id     INT NOT NULL REFERENCES orders(id),
  opened_by    INT NOT NULL REFERENCES users(id),
  reason       TEXT NOT NULL,
  resolution   TEXT CHECK (resolution IN ('released_to_buyer', 'refunded_to_seller')),
  resolved_by  INT REFERENCES users(id),
  resolved_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CHAT MESSAGES (optional, for later)
-- ============================================================
CREATE TABLE chat_messages (
  id          SERIAL PRIMARY KEY,
  order_id    INT NOT NULL REFERENCES orders(id),
  sender_id   INT NOT NULL REFERENCES users(id),
  body        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX chat_messages_order_id ON chat_messages(order_id);
