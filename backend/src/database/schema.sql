-- ASSA Smart Fisheries System — Database Schema
-- SQLite

PRAGMA foreign_keys = ON;

-- ─────────────────────────────────────────────
-- USERS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT    NOT NULL,
  email         TEXT    UNIQUE NOT NULL,
  password_hash TEXT    NOT NULL,
  role          TEXT    NOT NULL CHECK(role IN ('fisher','admin','buyer','superadmin','inspector')),
  phone         TEXT,
  created_at    DATETIME DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────────
-- FISHING ZONES
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fishing_zones (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL CHECK(type IN ('ALLOWED','RESTRICTED','PROHIBITED')),
  description TEXT,
  gps_lat     REAL,
  gps_lng     REAL,
  geo_polygon TEXT
);

-- ─────────────────────────────────────────────
-- FISHERS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fishers (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id           INTEGER NOT NULL REFERENCES users(id),
  license_number    TEXT    UNIQUE NOT NULL,
  license_status    TEXT    NOT NULL CHECK(license_status IN ('VALID','EXPIRED','SUSPENDED')),
  license_expiry    DATE    NOT NULL,
  zone_id           INTEGER REFERENCES fishing_zones(id),
  profile_photo_url TEXT,
  created_at        DATETIME DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────────
-- BOATS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS boats (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  fisher_id           INTEGER NOT NULL REFERENCES fishers(id),
  boat_name           TEXT    NOT NULL,
  registration_number TEXT    UNIQUE NOT NULL,
  capacity_kg         INTEGER,
  created_at          DATETIME DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────────
-- CATCH SUBMISSIONS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS catch_submissions (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  reference_id     TEXT    UNIQUE NOT NULL,
  fisher_id        INTEGER NOT NULL REFERENCES fishers(id),
  species          TEXT    NOT NULL,
  quantity_kg      REAL    NOT NULL,
  number_of_fish   INTEGER,
  fishing_gear     TEXT    NOT NULL,
  fishing_date     DATE    NOT NULL,
  fishing_time     TEXT    NOT NULL,
  zone_id          INTEGER NOT NULL REFERENCES fishing_zones(id),
  gps_lat          REAL,
  gps_lng          REAL,
  photo_urls       TEXT    DEFAULT '[]',
  zone_flag        TEXT    CHECK(zone_flag IN (NULL,'RESTRICTED_ZONE','PROHIBITED_ZONE')),
  status           TEXT    NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','VERIFIED','REJECTED')),
  rejection_reason TEXT,
  reviewed_by      INTEGER REFERENCES users(id),
  reviewed_at      DATETIME,
  submitted_at     DATETIME DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────────
-- MARKETPLACE LISTINGS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS marketplace_listings (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  catch_id             INTEGER NOT NULL REFERENCES catch_submissions(id),
  fisher_id            INTEGER NOT NULL REFERENCES fishers(id),
  species              TEXT    NOT NULL,
  quantity_available_kg REAL   NOT NULL,
  price_per_kg         REAL    NOT NULL,
  status               TEXT    NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','SOLD_OUT','REMOVED')),
  listed_at            DATETIME DEFAULT (datetime('now')),
  description          TEXT
);

-- ─────────────────────────────────────────────
-- ORDERS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  reference_id  TEXT    UNIQUE NOT NULL,
  listing_id    INTEGER NOT NULL REFERENCES marketplace_listings(id),
  buyer_id      INTEGER NOT NULL REFERENCES users(id),
  quantity_kg   REAL    NOT NULL,
  price_per_kg  REAL    NOT NULL,
  total_price   REAL    NOT NULL,
  status        TEXT    NOT NULL DEFAULT 'CONFIRMED' CHECK(status IN ('CONFIRMED','DELIVERED','CANCELLED')),
  ordered_at    DATETIME DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────────
-- SPECIES QUOTAS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS species_quotas (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  species          TEXT    NOT NULL,
  monthly_limit_kg REAL    NOT NULL,
  current_month_kg REAL    NOT NULL DEFAULT 0,
  month            INTEGER NOT NULL,
  year             INTEGER NOT NULL,
  updated_at       DATETIME DEFAULT (datetime('now')),
  UNIQUE(species, month, year)
);

-- ─────────────────────────────────────────────
-- ALERTS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alerts (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  type                TEXT    NOT NULL,
  title               TEXT    NOT NULL,
  message             TEXT    NOT NULL,
  severity            TEXT    NOT NULL DEFAULT 'INFO' CHECK(severity IN ('INFO','WARNING','CRITICAL')),
  is_read             INTEGER NOT NULL DEFAULT 0,
  related_entity_type TEXT,
  related_entity_id   INTEGER,
  created_at          DATETIME DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────────
-- NOTIFICATIONS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id),
  type       TEXT    NOT NULL,
  title      TEXT    NOT NULL,
  message    TEXT    NOT NULL,
  is_read    INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────────
-- BUYERS (extended profile)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS buyers (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id),
  location   TEXT,
  created_at DATETIME DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────────
-- AUDIT LOG (government accountability)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_user_id INTEGER REFERENCES users(id),
  action        TEXT    NOT NULL,
  entity_type   TEXT,
  entity_id     INTEGER,
  payload_json  TEXT    DEFAULT '{}',
  ip            TEXT,
  created_at    DATETIME DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────────
-- BOAT TRIPS (fishing sessions)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS boat_trips (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  boat_id    INTEGER NOT NULL REFERENCES boats(id),
  fisher_id  INTEGER NOT NULL REFERENCES fishers(id),
  started_at DATETIME NOT NULL DEFAULT (datetime('now')),
  ended_at   DATETIME,
  status     TEXT NOT NULL DEFAULT 'ACTIVE'
    CHECK(status IN ('ACTIVE','COMPLETED','CANCELLED'))
);

CREATE INDEX IF NOT EXISTS idx_boat_trips_boat_status ON boat_trips(boat_id, status);
CREATE INDEX IF NOT EXISTS idx_boat_trips_fisher ON boat_trips(fisher_id, status);

-- ─────────────────────────────────────────────
-- BOAT POSITIONS (fleet tracking)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS boat_positions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  boat_id     INTEGER NOT NULL REFERENCES boats(id),
  trip_id     INTEGER REFERENCES boat_trips(id),
  lat         REAL    NOT NULL,
  lng         REAL    NOT NULL,
  status      TEXT    NOT NULL CHECK(status IN ('DOCKED','FISHING','RETURNING','OFFLINE')),
  recorded_at DATETIME DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_boat_positions_boat_recorded
  ON boat_positions(boat_id, recorded_at DESC);

-- ─────────────────────────────────────────────
-- PRICE HISTORY (market intelligence)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS price_history (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  species      TEXT NOT NULL,
  zone_id      INTEGER REFERENCES fishing_zones(id),
  price_per_kg REAL NOT NULL,
  recorded_at  DATETIME DEFAULT (datetime('now')),
  source       TEXT NOT NULL CHECK(source IN ('listing','order','admin'))
);

CREATE INDEX IF NOT EXISTS idx_price_history_species_date
  ON price_history(species, recorded_at DESC);

-- ─────────────────────────────────────────────
-- MARKET SNAPSHOTS (daily aggregates)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS market_snapshots (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  snapshot_date   DATE NOT NULL,
  species         TEXT NOT NULL,
  total_listed_kg REAL NOT NULL DEFAULT 0,
  total_sold_kg   REAL NOT NULL DEFAULT 0,
  avg_price       REAL,
  order_count     INTEGER NOT NULL DEFAULT 0,
  UNIQUE(snapshot_date, species)
);

-- ─────────────────────────────────────────────
-- ZONE SEASON RULES
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zone_season_rules (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  zone_id      INTEGER NOT NULL REFERENCES fishing_zones(id),
  species      TEXT NOT NULL,
  season_start TEXT NOT NULL,
  season_end   TEXT NOT NULL,
  rule_type    TEXT NOT NULL CHECK(rule_type IN ('OPEN','CLOSED','LIMIT')),
  max_kg       REAL,
  notes        TEXT
);

-- ─────────────────────────────────────────────
-- DOMAIN EVENTS (SSE replay buffer)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS domain_events (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type   TEXT    NOT NULL,
  payload_json TEXT    NOT NULL DEFAULT '{}',
  created_at   DATETIME DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────────
-- FISHER COMPLIANCE SCORES
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fisher_compliance (
  fisher_id          INTEGER PRIMARY KEY REFERENCES fishers(id),
  score              INTEGER NOT NULL DEFAULT 100,
  violations_count   INTEGER NOT NULL DEFAULT 0,
  open_violations    INTEGER NOT NULL DEFAULT 0,
  last_violation_at  DATETIME,
  updated_at         DATETIME DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────────
-- INSPECTIONS (enforcement assignments)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inspections (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  reference_id  TEXT    UNIQUE NOT NULL,
  inspector_id  INTEGER NOT NULL REFERENCES users(id),
  fisher_id     INTEGER REFERENCES fishers(id),
  zone_id       INTEGER REFERENCES fishing_zones(id),
  title         TEXT    NOT NULL,
  instructions  TEXT,
  status        TEXT    NOT NULL DEFAULT 'ASSIGNED'
    CHECK(status IN ('ASSIGNED','IN_PROGRESS','COMPLETED','CANCELLED')),
  outcome       TEXT    CHECK(outcome IN (NULL,'PASS','WARNING','VIOLATION_FOUND')),
  notes         TEXT,
  scheduled_at  DATETIME,
  completed_at  DATETIME,
  created_at    DATETIME DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────────
-- VIOLATIONS (enforcement records)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS violations (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  reference_id        TEXT    UNIQUE NOT NULL,
  fisher_id           INTEGER NOT NULL REFERENCES fishers(id),
  boat_id             INTEGER REFERENCES boats(id),
  zone_id             INTEGER REFERENCES fishing_zones(id),
  catch_id            INTEGER REFERENCES catch_submissions(id),
  inspection_id       INTEGER REFERENCES inspections(id),
  type                TEXT    NOT NULL,
  severity            TEXT    NOT NULL CHECK(severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  description         TEXT    NOT NULL,
  lat                 REAL,
  lng                 REAL,
  status              TEXT    NOT NULL DEFAULT 'OPEN'
    CHECK(status IN ('OPEN','UNDER_REVIEW','RESOLVED','DISMISSED')),
  fine_amount         REAL,
  fine_status         TEXT    CHECK(fine_status IN (NULL,'PENDING','PAID','WAIVED')),
  reported_by_user_id INTEGER NOT NULL REFERENCES users(id),
  reviewed_by         INTEGER REFERENCES users(id),
  evidence_urls       TEXT    DEFAULT '[]',
  created_at          DATETIME DEFAULT (datetime('now')),
  resolved_at         DATETIME
);

CREATE INDEX IF NOT EXISTS idx_violations_fisher ON violations(fisher_id);
CREATE INDEX IF NOT EXISTS idx_inspections_inspector ON inspections(inspector_id, status);
