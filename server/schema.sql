CREATE TABLE IF NOT EXISTS platform_lock (id integer PRIMARY KEY CHECK (id = 1));
INSERT INTO platform_lock VALUES (1) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS accounts (
 id text PRIMARY KEY, username text NOT NULL UNIQUE, password_hash text NOT NULL,
 role text NOT NULL CHECK(role IN ('admin','player')), status text NOT NULL CHECK(status IN ('pending','approved','suspended')),
 balance numeric(20,2) NOT NULL DEFAULT 0 CHECK(balance >= 0 AND balance <= 9000000000000), migrated_at bigint, created_at bigint NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (token_hash text PRIMARY KEY, user_id text NOT NULL REFERENCES accounts(id), expires_at bigint NOT NULL);
CREATE TABLE IF NOT EXISTS ledger (id text PRIMARY KEY, user_id text NOT NULL REFERENCES accounts(id), cause text NOT NULL UNIQUE, delta numeric(20,2) NOT NULL, balance_after numeric(20,2) NOT NULL, note text NOT NULL, created_at bigint NOT NULL);
CREATE INDEX IF NOT EXISTS ledger_user ON ledger(user_id,created_at DESC);
CREATE TABLE IF NOT EXISTS migrations (id text PRIMARY KEY, user_id text NOT NULL UNIQUE REFERENCES accounts(id), origin_key text NOT NULL UNIQUE, snapshot jsonb NOT NULL, status text NOT NULL DEFAULT 'pending', verified jsonb, requested_at bigint NOT NULL, reviewed_by text REFERENCES accounts(id));
CREATE TABLE IF NOT EXISTS designs (id text PRIMARY KEY, author_id text NOT NULL REFERENCES accounts(id), kind text NOT NULL CHECK(kind IN ('ai','sticker','case')), title text NOT NULL, description text NOT NULL, payload jsonb NOT NULL, status text NOT NULL DEFAULT 'draft', cost bigint NOT NULL DEFAULT 0, featured_week text, created_at bigint NOT NULL);
CREATE TABLE IF NOT EXISTS media (design_id text PRIMARY KEY REFERENCES designs(id), bytes bytea NOT NULL, mime text NOT NULL);
CREATE TABLE IF NOT EXISTS items (id text PRIMARY KEY, owner_id text NOT NULL REFERENCES accounts(id), catalog_id text, design_id text REFERENCES designs(id), metadata jsonb NOT NULL DEFAULT '{}', locked_by text, source_key text NOT NULL UNIQUE, created_at bigint NOT NULL, CHECK((catalog_id IS NULL) <> (design_id IS NULL)));
CREATE INDEX IF NOT EXISTS items_owner ON items(owner_id);
CREATE TABLE IF NOT EXISTS likes (design_id text REFERENCES designs(id), user_id text REFERENCES accounts(id), PRIMARY KEY(design_id,user_id));
CREATE TABLE IF NOT EXISTS reports (design_id text REFERENCES designs(id), user_id text REFERENCES accounts(id), reason text NOT NULL, created_at bigint NOT NULL, PRIMARY KEY(design_id,user_id));
CREATE TABLE IF NOT EXISTS clans (id text PRIMARY KEY, name text NOT NULL UNIQUE, tag text NOT NULL UNIQUE, emblem text NOT NULL, code text NOT NULL UNIQUE, leader_id text NOT NULL REFERENCES accounts(id), points bigint NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS clan_members (user_id text PRIMARY KEY REFERENCES accounts(id), clan_id text NOT NULL REFERENCES clans(id));
CREATE TABLE IF NOT EXISTS clan_requests (clan_id text REFERENCES clans(id), user_id text REFERENCES accounts(id), PRIMARY KEY(clan_id,user_id));
CREATE TABLE IF NOT EXISTS clan_events (event_key text PRIMARY KEY, clan_id text NOT NULL REFERENCES clans(id), kind text NOT NULL, created_at bigint NOT NULL);
CREATE TABLE IF NOT EXISTS auctions (id text PRIMARY KEY, seller_id text NOT NULL REFERENCES accounts(id), item_id text NOT NULL REFERENCES items(id), minimum bigint NOT NULL CHECK(minimum>0), buyout bigint, highest bigint NOT NULL DEFAULT 0, bidder_id text REFERENCES accounts(id), status text NOT NULL DEFAULT 'active', ends_at bigint NOT NULL, created_at bigint NOT NULL);
CREATE INDEX IF NOT EXISTS auctions_expiry ON auctions(status,ends_at);
CREATE TABLE IF NOT EXISTS bids (id text PRIMARY KEY, auction_id text REFERENCES auctions(id), bidder_id text REFERENCES accounts(id), amount bigint NOT NULL CHECK(amount>0), created_at bigint NOT NULL);
CREATE TABLE IF NOT EXISTS battles (id text PRIMARY KEY, code text NOT NULL UNIQUE, host_id text NOT NULL REFERENCES accounts(id), case_snapshot jsonb NOT NULL, rounds integer NOT NULL CHECK(rounds BETWEEN 1 AND 5), capacity integer NOT NULL CHECK(capacity IN (2,4)), cost bigint NOT NULL, seed text NOT NULL, commitment text NOT NULL, phase text NOT NULL DEFAULT 'waiting', starts_at bigint, ends_at bigint, expires_at bigint NOT NULL, result jsonb, created_at bigint NOT NULL);
CREATE TABLE IF NOT EXISTS battle_members (id text PRIMARY KEY, battle_id text REFERENCES battles(id), user_id text REFERENCES accounts(id), slot integer NOT NULL, UNIQUE(battle_id,user_id), UNIQUE(battle_id,slot));
CREATE TABLE IF NOT EXISTS collection_claims (user_id text REFERENCES accounts(id), collection_id text NOT NULL, created_at bigint NOT NULL, PRIMARY KEY(user_id,collection_id));
CREATE TABLE IF NOT EXISTS quotes (id text PRIMARY KEY, user_id text REFERENCES accounts(id), input jsonb NOT NULL, price bigint NOT NULL CHECK(price>0), tariff text NOT NULL, expires_at bigint NOT NULL);
CREATE TABLE IF NOT EXISTS ai_jobs (id text PRIMARY KEY, quote_id text NOT NULL UNIQUE REFERENCES quotes(id), user_id text NOT NULL REFERENCES accounts(id), input jsonb NOT NULL, price bigint NOT NULL CHECK(price>0), status text NOT NULL DEFAULT 'queued', error text, design_id text REFERENCES designs(id), started_at bigint, finished_at bigint, created_at bigint NOT NULL);
CREATE INDEX IF NOT EXISTS jobs_queue ON ai_jobs(status,created_at);
CREATE TABLE IF NOT EXISTS rate_limits (key text PRIMARY KEY, hits integer NOT NULL, resets_at bigint NOT NULL);
CREATE TABLE IF NOT EXISTS admin_audit (id text PRIMARY KEY, actor_id text NOT NULL REFERENCES accounts(id), action text NOT NULL, details jsonb NOT NULL, created_at bigint NOT NULL);
