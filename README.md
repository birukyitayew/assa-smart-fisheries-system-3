# ASSA — Smart Fisheries Monitoring & Digital Fish Market System

> University Internship Project | React + Tailwind CSS | Node.js + Express | SQLite

A three-module connected platform demonstrating a complete fisheries management ecosystem for Lake Tana, Ethiopia.

---

## Modules & Ports

| Module | Port | URL | Credentials |
|--------|------|-----|-------------|
| **Admin / Command Center** | 3001 | http://localhost:3001 | dawit@fisheries.gov.et / admin123 |
| **Inspector (same app)** | 3001 | http://localhost:3001 | solomon@fisheries.gov.et / inspector123 |
| **Fisher App** | 3002 | http://localhost:3002 | tesfaye@fisher.et / fisher123 |
| **Fish Market** | 3003 | http://localhost:3003 | mesfin@buyer.et / buyer123 |
| **Backend API** | 4000 | http://localhost:4000/api/health | — |

---

**All demo logins:** see [CREDENTIALS.md](CREDENTIALS.md) (not shown in app UI).

---

## Quick Start

From the project root:

```bash
npm install
npm run install:all
npm run seed
npm run dev
```

### Environment variables

- The backend uses environment variables (see `backend/.env.example`). For local dev, copy it to `backend/.env` and update values as needed.
- Do not commit real secrets (like a production `JWT_SECRET`) to the repository.

That starts all four services:
- Backend API: http://localhost:4000/api/health
- Admin Dashboard: http://localhost:3001
- Fisher App: http://localhost:3002
- Fish Market: http://localhost:3003

You can also run modules separately:

### 1. Install & seed the database

```bash
cd backend
npm install
npm run seed
```

### 2. Start the backend

```bash
cd backend
npm run dev
```

### 3. Start each frontend (in separate terminals)

```bash
# Admin Dashboard
cd admin-dashboard && npm run dev

# Fisher App
cd fisher-app && npm run dev

# Marketplace
cd marketplace && npm run dev
```

### Reset demo data

```bash
npm run reset
```

---

## Government Command Center (Phase 1)

The admin dashboard is now a **live command center** with:

| Route | Feature |
|-------|---------|
| `/` | Command Overview — live KPIs, activity feed, charts |
| `/live` | Live Operations — transaction ticker, pending queue |
| `/map` | Lake Command Map — zones, fleet, catch pins |
| `/market` | Market Monitor — buyers, sellers, prices, supply chain |
| `/audit` | Audit Log — government accountability trail |

**LIVE indicator** in the header shows SSE connection status. Events propagate across apps without page refresh.

Optional fleet simulator (updates boat GPS every 10s):

```bash
npm run simulate:boats
```

---

## Phase 2: Inspector & Enforcement

| Route | Feature |
|-------|---------|
| `/inspections` | Assign and track field inspections |
| `/violations` | Violation reports, fines, suspicious fishers |
| Fisher home | Digital license QR, compliance score, open violations |

**Inspector login (same admin app, limited nav):** `solomon@fisheries.gov.et` / `inspector123`

**APIs:** `/api/inspector/*`, `/api/admin/inspections`, `/api/admin/violations`, `/api/admin/enforcement/suspicious-fishers`

Device GPS is captured on catch submit; catches far from the selected zone trigger a GPS mismatch alert.

---

## Phase 3: Fleet & Intelligence

| Route | Feature |
|-------|---------|
| `/fleet` | **GC-05** Fleet ops — boat list, status, 24h route polyline on map |
| `/intelligence` | **GC-10** Market intelligence — price trends, snapshots, shortage table |
| Fisher home | **FI-07** Start/end fishing trip (requires valid license + boat) |
| Marketplace | Live SSE toasts (`listing.created`, `order.placed`); price sparkline on cards |

**New tables:** `boat_trips`, `price_history`, `market_snapshots`, `zone_season_rules`, `geo_polygon` on zones.

**Fisher trip APIs:**
- `POST /api/fisher/trips/start` — one active trip per boat/fisher
- `POST /api/fisher/trips/end`
- `GET  /api/fisher/trips/active`

**Fleet & intelligence APIs:**
- `GET  /api/admin/fleet` — boats + active trip + last position
- `GET  /api/admin/fleet/:boatId/history?hours=24` — route points for polyline
- `GET  /api/admin/intelligence/overview` — charts data
- `POST /api/admin/intelligence/refresh-snapshots` — rebuild demo snapshots
- `GET/POST/PUT/DELETE /api/admin/season-rules` — seasonal zone rules

**Marketplace:** `GET /api/realtime/market/stream` (guest or buyer token); `GET /api/marketplace/price-history/:species`

**Boat simulator** only moves boats with **ACTIVE** trips:

```bash
npm run simulate:boats
```

Start a trip in the fisher app first, then run the simulator to see route history on **Fleet**.

---

## Phase 4: Production Hardening

| Area | What changed |
|------|----------------|
| Database | **PostgreSQL** (Docker local, Neon/Render prod) via **Prisma** |
| Auth | Refresh tokens + rotation; login rate limit; optional account lockout |
| Security | `SECURITY.md`, stratified rate limits, `npm audit` in CI |
| i18n | English + **Amharic** toggle (`assa_lang` in localStorage) on critical screens |
| E2E | Playwright `e2e/demo-workflow.spec.js` |
| Deploy | Vite `base` paths (`/admin/`, `/fisher/`, `/market/`), `backend/Dockerfile`, `render.yaml`, `vercel.json` |

### Local PostgreSQL

```bash
docker compose up -d
cd backend && cp .env.example .env
npx prisma migrate deploy
npm run seed
```

### Run (same ports; use path prefixes in browser)

| App | URL |
|-----|-----|
| Admin | http://localhost:3001/admin/ |
| Fisher | http://localhost:3002/fisher/ |
| Market | http://localhost:3003/market/ |
| API | http://localhost:4000/api/health |

```bash
npm run dev
```

### Auth refresh

Login returns `accessToken` + `refreshToken`. Frontends store refresh in `sessionStorage` and retry once on HTTP 401 via `/api/auth/refresh`.

### E2E tests

```bash
npm run dev   # in one terminal
npm run test:e2e
npm run test:e2e:ui   # interactive
```

### Backups

```bash
DATABASE_URL=postgresql://assa:assa@localhost:5432/assa ./scripts/backup-db.sh
```

Restore: `gunzip -c backups/assa-*.sql.gz | psql $DATABASE_URL`

### Production checklist

- Set strong `JWT_SECRET` (never `change_me` in prod)
- Set `CORS_ORIGINS` to your Vercel URL(s)
- Point `vercel.json` API rewrite to your Render/Fly host
- Run API on a long-running instance (SSE requires it)
- Enable Neon backups / PITR for production DB

---

## Phase 5: Multi-Region / Multi-Lake

National scale across **Lake Tana**, **Lake Ziway**, and **Lake Hawassa** (SMS, Redis cluster SSE, offline inspector sync, and national ID remain deferred).

| Area | What changed |
|------|----------------|
| Data | `regions` table; `fishing_zones.region_id`; optional `users.region_id` for `regional_admin` |
| API | `region.service.js` — `X-Region-Id` / `?region_id=` for national admins; forced scope for `regional_admin` |
| Admin reads | Dashboard, fleet, map, catches, market, intelligence filtered by region |
| UI | Header region selector; `RegionContext` + `sessionStorage` (`assa_region_id`); map centers per lake |
| Seed | Ziway/Hawassa zones, fishers, catches; `regional@ziway.gov.et` / `admin123` |
| E2E | `e2e/regional.spec.js` |

### Verify multi-region

1. Login `dawit@fisheries.gov.et` → header **All lakes (national)** → aggregated KPIs  
2. Select **Lake Ziway** → fleet/catches show Ziway data only; map centers on Ziway  
3. Login `regional@ziway.gov.et` → fixed Lake Ziway scope; cannot view Tana catches  
4. `npm run test:e2e` (includes regional spec)

---

## Demo Workflow (7 minutes)

Open 4 browser tabs:
- **Admin Command Center:** http://localhost:3001/admin/ (login: dawit@fisheries.gov.et / admin123)
- **Fisher App:** http://localhost:3002/fisher/ (375px width) — tesfaye@fisher.et / fisher123
- **Fish Market:** http://localhost:3003/market/ — mesfin@buyer.et / buyer123
- Optional: run `npm run simulate:boats` after fisher starts a trip (see Phase 3)

**Step 1** — Admin: Confirm header shows **LIVE** (green) and try the **region selector** (national vs Lake Ziway) on Command Overview  
**Step 1b** — Fisher: **Start fishing trip** on home screen (Tesfaye has demo active trip after seed)  
**Step 1c** — Admin: Open **Fleet** → select boat → route polyline appears; run `npm run simulate:boats` to extend track  
**Step 2** — Fisher: Submit catch (Tilapia, 25 kg, North Zone)  
**Step 3** — Admin: Live Activity feed + pending count update **without refresh**  
**Step 4** — Admin: Approve catch (Live Operations or Catches detail)  
**Step 5** — Market: New listing appears; Admin: `listing.created` in activity feed  
**Step 6** — Buyer: Place order 10 kg  
**Step 7** — Admin: Revenue KPI updates; open **Market Monitor**, **Intelligence**, and **Lake Map** (zone polygons)  
**Step 8** — Market: Sonner toast on new listing/order; listing cards show 7-day price sparkline  
**Step 9** — Admin: **Audit Log** shows approve/order actions  

**Quota enforcement:** Approving a catch that would exceed monthly species quota returns HTTP 409.

---

## Project Structure

```
assa-smart-fisheries-system/
├── backend/                  Node.js + Express + PostgreSQL (Prisma)
│   ├── prisma/               schema, migrations, seed.js
│   ├── src/
│   │   ├── database/         prisma client
│   │   ├── routes/           auth, catches, admin, marketplace
│   │   ├── services/         quota, notification, listing
│   │   └── server.js
│   └── package.json
├── admin-dashboard/          React (Vite) — port 3001
├── fisher-app/               React (Vite, mobile-first) — port 3002
├── marketplace/              React (Vite) — port 3003
└── README.md
```

---

## API Endpoints

### Auth
- `POST /api/auth/login` — Login (all roles)
- `GET  /api/auth/me` — Current user

### Fisher
- `GET  /api/fisher/profile` — Fisher profile + today's summary + active trip
- `POST /api/fisher/trips/start` — Start fishing trip
- `POST /api/fisher/trips/end` — End active trip
- `GET  /api/fisher/trips/active` — Current active trip
- `GET  /api/fisher/catches` — Fisher's catch history
- `POST /api/catches` — Submit a new catch
- `GET  /api/notifications` — Fisher notifications
- `GET  /api/zones` — All fishing zones

### Admin / Command Center
- `GET  /api/admin/dashboard/stats` — KPI cards
- `GET  /api/admin/command/live-stats` — Live command KPIs
- `GET  /api/admin/map/layers` — Zones, fleet, catch pins
- `GET  /api/admin/fleet` — Fleet list with trips
- `GET  /api/admin/fleet/:boatId/history` — Route history for map polyline
- `GET  /api/admin/fleet/positions` — Latest boat positions
- `GET  /api/admin/intelligence/overview` — Market intelligence dashboard data
- `POST /api/admin/intelligence/refresh-snapshots` — Rebuild market snapshots
- `GET  /api/admin/season-rules` — Zone seasonal rules CRUD
- `GET  /api/admin/market/*` — Market monitor (overview, buyers, sellers, prices, shortages, transactions, network)
- `GET  /api/admin/audit` — Audit log (filterable)
- `GET  /api/admin/events/recent` — Recent domain events
- `GET  /api/realtime/stream?token=JWT` — SSE stream (admin/inspector)
- `GET  /api/realtime/market/stream` — Marketplace SSE (guest or buyer token)
- `GET  /api/admin/catches` — All catches (filterable)
- `PUT  /api/admin/catches/:id/approve` — Approve catch (409 if quota exceeded)
- `PUT  /api/admin/catches/:id/reject` — Reject catch
- `GET  /api/admin/quotas` — Species quota usage
- `GET  /api/admin/alerts` — System alerts

### Marketplace
- `GET  /api/marketplace/listings` — Active listings (with price_trend, shortage_flags)
- `GET  /api/marketplace/price-history/:species` — 7-day price series
- `GET  /api/marketplace/listings/:id` — Listing detail
- `POST /api/marketplace/orders` — Place order (buyer auth required)
- `GET  /api/marketplace/stats` — Market overview stats
- `GET  /api/marketplace/activity` — Recent activity feed
# assa-smart-fisheries-system-3
