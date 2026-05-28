# ASSA — Smart Fisheries Monitoring & Digital Fish Market System

> University Internship Project | React 18 + Vite + Tailwind | Node.js + Express + Prisma | PostgreSQL

A four-app platform — backend API plus three frontends (admin command center, fisher PWA, marketplace) — covering the end-to-end fisheries workflow on Lake Tana: catch reporting, quota enforcement, fleet tracking, market intelligence, and inspector enforcement.

---

## Modules & Ports

Each frontend is served under a Vite base path so a single domain can host all three apps in production (see Phase 4).

| Module                            | Port | URL                                       | Credentials                             |
| --------------------------------- | ---- | ----------------------------------------- | --------------------------------------- |
| **Admin / Command Center**        | 3001 | http://localhost:3001/admin/              | dawit@fisheries.gov.et / admin123       |
| **Inspector** (same app, limited) | 3001 | http://localhost:3001/admin/              | solomon@fisheries.gov.et / inspector123 |
| **Fisher App** (installable PWA)  | 3002 | http://localhost:3002/fisher/             | tesfaye@fisher.et / fisher123           |
| **Fish Market**                   | 3003 | http://localhost:3003/market/             | mesfin@buyer.et / buyer123              |
| **Backend API**                   | 4000 | http://localhost:4000/api/health          | —                                       |
| **Detailed diagnostics**          | 4000 | http://localhost:4000/api/health/detailed | —                                       |

**All demo logins:** see [CREDENTIALS.md](CREDENTIALS.md) (not shown in app UI).

---

## Quick Start

```bash
# 1. Postgres + Redis
docker compose up -d

# 2. Install all four workspaces
npm run install:all

# 3. Backend env
cp backend/.env.example backend/.env   # then edit JWT_SECRET

# 4. Migrate + seed the database
npm run prisma:migrate
npm run seed

# 5. Run everything (backend + 3 frontends) concurrently
npm run dev
```

That starts all four services concurrently with color-coded logs:

- Backend API: http://localhost:4000/api/health
- Admin Dashboard: http://localhost:3001/admin/
- Fisher App (PWA): http://localhost:3002/fisher/
- Fish Market: http://localhost:3003/market/

### Environment variables

- The backend reads `backend/.env` (see `backend/.env.example`). `JWT_SECRET` must be a 32+ char value before the server will start.
- Optional integrations: `CLOUDINARY_URL` (catch photo uploads), `REDIS_URL` (SSE fan-out).
- Do not commit real secrets (like a production `JWT_SECRET`) to the repository.

### Run modules separately

```bash
npm run dev:backend     # API only
npm run dev:admin       # Admin / Command Center
npm run dev:fisher      # Fisher PWA
npm run dev:market      # Marketplace
```

### Reset demo data

```bash
npm run reset            # prisma migrate reset --force + re-seed
```

---

## Government Command Center (Phase 1)

The admin dashboard is now a **live command center** with:

| Route     | Feature                                                |
| --------- | ------------------------------------------------------ |
| `/`       | Command Overview — live KPIs, activity feed, charts    |
| `/live`   | Live Operations — transaction ticker, pending queue    |
| `/map`    | Lake Command Map — zones, fleet, catch pins            |
| `/market` | Market Monitor — buyers, sellers, prices, supply chain |
| `/audit`  | Audit Log — government accountability trail            |

**LIVE indicator** in the header shows SSE connection status. Events propagate across apps without page refresh.

Optional fleet simulator (updates boat GPS every 10s):

```bash
npm run simulate:boats
```

---

## Phase 2: Inspector & Enforcement

| Route          | Feature                                               |
| -------------- | ----------------------------------------------------- |
| `/inspections` | Assign and track field inspections                    |
| `/violations`  | Violation reports, fines, suspicious fishers          |
| Fisher home    | Digital license QR, compliance score, open violations |

**Inspector login (same admin app, limited nav):** `solomon@fisheries.gov.et` / `inspector123`

**APIs:** `/api/inspector/*`, `/api/admin/inspections`, `/api/admin/violations`, `/api/admin/enforcement/suspicious-fishers`

Device GPS is captured on catch submit; catches far from the selected zone trigger a GPS mismatch alert.

---

## Phase 3: Fleet & Intelligence

| Route           | Feature                                                                       |
| --------------- | ----------------------------------------------------------------------------- |
| `/fleet`        | **GC-05** Fleet ops — boat list, status, 24h route polyline on map            |
| `/intelligence` | **GC-10** Market intelligence — price trends, snapshots, shortage table       |
| Fisher home     | **FI-07** Start/end fishing trip (requires valid license + boat)              |
| Marketplace     | Live SSE toasts (`listing.created`, `order.placed`); price sparkline on cards |

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

| Area        | What changed                                                                                                                                                |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Database    | **PostgreSQL** (Docker local, Neon/Render prod) via **Prisma**                                                                                              |
| Auth        | Refresh tokens + rotation; login rate limit; optional account lockout; secure **Password Reset flow**                                                       |
| Security    | `SECURITY.md`, stratified rate limits, `npm audit` in CI, HS256 JWT pinning                                                                                 |
| i18n        | English + **Amharic** toggle (`assa_lang` in localStorage) on critical screens                                                                              |
| Diagnostics | `/api/health/detailed` active deep diagnostic probe checking database & Cloudinary                                                                          |
| Testing     | Native Node test runner (`node --test tests/`) with Auth, Catches, Quotas, and E2E integration tests                                                        |
| Deploy      | Vite `base` paths (`/admin/`, `/fisher/`, `/market/`), `backend/Dockerfile`, `render.yaml` with Starter tier database and daily backup crons, `vercel.json` |

The local Postgres + Redis stack is in `docker-compose.yml` (`docker compose up -d`).

### Auth refresh & reset

- Login returns `accessToken` + `refreshToken`. Frontends store refresh in `sessionStorage` and retry once on HTTP 401 via `/api/auth/refresh`.
- **Forgot Password**: `POST /api/auth/forgot-password` generates a cryptographic reset token.
- **Reset Password**: `POST /api/auth/reset-password` hashes and updates the password in a single transactional query.

### E2E and Backend Integration Tests

To run the complete test suite (14 passes, 0 failures) validating login, catches, quotas, rejection workflows, out-of-stock ordering, and admin onboarding:

```bash
# In backend/ directory:
npm run test
```

For Playwright browser tests:

```bash
npm run dev   # in one terminal
npm run test:e2e
npm run test:e2e:ui   # interactive
```

### Backups & Operations

- Automated backups are configured daily at midnight via Render cron service in `render.yaml`.
- Manual back up script:
  ```bash
  DATABASE_URL=postgresql://assa:assa@localhost:5432/assa ./scripts/backup-db.sh
  ```
- Detailed operations, uptime heartbeats (UptimeRobot), and Sentry profiling configs are outlined in [uptime_monitoring.md](Docs/uptime_monitoring.md).

---

## Phase 5: Multi-Region / Multi-Lake

National scale across **Lake Tana**, **Lake Ziway**, and **Lake Hawassa** (SMS, Redis cluster SSE, offline inspector sync, and national ID remain deferred).

| Area        | What changed                                                                                               |
| ----------- | ---------------------------------------------------------------------------------------------------------- |
| Data        | `regions` table; `fishing_zones.region_id`; optional `users.region_id` for `regional_admin`                |
| API         | `region.service.js` — `X-Region-Id` / `?region_id=` for national admins; forced scope for `regional_admin` |
| Admin reads | Dashboard, fleet, map, catches, market, intelligence filtered by region                                    |
| UI          | Header region selector; `RegionContext` + `sessionStorage` (`assa_region_id`); map centers per lake        |
| Seed        | Ziway/Hawassa zones, fishers, catches; `regional@ziway.gov.et` / `admin123`                                |
| E2E         | `e2e/regional.spec.js`                                                                                     |

---

## Phase 6: Post-Launch Operations (Administrative Onboarding)

Admins can onboard new Cooperative members, port authorities, and marketplace buyers directly from the **Onboard User** tab on the side navigation menu:

- **UI Component**: React `UsersPage.jsx` integrated into Route `/users/create`.
- **API Handler**: `POST /api/admin/users` executing atomic profile updates (fisher licenses, default boat registration, or buyer location) using transactional rollbacks.

---

## Phase 7: Fisher App as an Installable PWA

The fisher app is a full Progressive Web App so fishers can install it to a home screen and keep working through patchy connectivity on the lake.

| Area              | Detail                                                                                                             |
| ----------------- | ------------------------------------------------------------------------------------------------------------------ |
| Manifest          | `fisher-app/public/manifest.webmanifest` — `start_url`/`scope` = `/fisher/`, `display: standalone`, navy `#1f3a5f` |
| Icons             | 192/512 PNG, 512 maskable, SVG sources, plus a 180×180 `apple-touch-icon.png`                                      |
| Service worker    | `fisher-app/public/service-worker.js` — precaches the app shell, network-first nav, stale-while-revalidate assets  |
| `/api` strategy   | **Never cached** — `/api/*` requests pass through to the network so authenticated calls never serve stale data     |
| Install UX        | `InstallBanner.jsx` captures `beforeinstallprompt`, surfaces a dismissible CTA inside `AppShell`                   |
| SW update toast   | Sonner toast on `controllerchange` so users get a one-tap reload to the new build                                  |
| Registration gate | Service worker only registers when `import.meta.env.PROD` — `npm run dev:fisher` is unaffected                     |

Verify a production build locally by serving `fisher-app/dist/` from the same origin as the API (e.g. behind nginx, the `vercel.json` rewrites, or any static-server + reverse proxy on one port) and visiting `/fisher/`.

---

## AI Security Assistant (admin dashboard)

A floating chat assistant lives inside the admin command center (`admin-dashboard/src/components/security/AiSecurityAssistant.jsx`). It surfaces threat analysis on demand — quota breaches, zone violations, license-expiry incidents, suspicious activity patterns — with quick-prompt buttons for the most common questions.

The assistant is backed by **Groq Cloud** via a server-side proxy (`POST /api/admin/security-assistant/chat`); the API key never leaves the backend. Set `GROQ_API_KEY` in `backend/.env` to enable live LLM responses (default model: `llama-3.3-70b-versatile`, overridable via `GROQ_MODEL`). If the key is missing or the provider is unreachable, the widget transparently falls back to a built-in library of canned responses so the demo keeps working offline. Access is restricted to `admin`, `superadmin`, `regional_admin`, and `inspector` roles, and a dedicated rate limiter is applied on top of the global one.

## Sidebar Notification Indicators

The admin sidebar tracks per-route status via `NotificationContext`, with a debounced state machine that promotes routes through `unread → active → critical` based on recent realtime events. Hover-tooltips explain why a route is flagged. Demo notifications are seeded via `useDemoNotifications` so the UI is exercised even when no real events have fired.

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
│   │   ├── database/         Prisma client
│   │   ├── routes/           auth, catches, admin, inspector, marketplace, realtime
│   │   ├── services/         quota, notification, listing, region, market intel
│   │   └── server.js
│   ├── scripts/              simulate-boats.js, backup-db.sh, capture.js
│   ├── tests/                node --test integration suites
│   └── Dockerfile
├── admin-dashboard/          React + Vite, base `/admin/`  — port 3001
├── fisher-app/               React + Vite PWA, base `/fisher/` — port 3002
│   └── public/               manifest.webmanifest, service-worker.js, icons/
├── marketplace/              React + Vite, base `/market/` — port 3003
├── e2e/                      Playwright specs (demo-workflow, regional)
├── scripts/                  build-vercel.mjs, generate_pptx.py, capture.js
├── Docs/                     design.md, requirements.md, uptime_monitoring.md
├── docker-compose.yml        Postgres + Redis for local dev
├── render.yaml               Render deploy + daily backup crons
├── vercel.json               Vercel rewrites for the three frontends
├── CREDENTIALS.md            All demo logins
├── SECURITY.md               Disclosure + hardening policy
├── DEPLOYMENT.md             Production deployment runbook
└── README.md
```

---

## API Endpoints

### Auth

- `POST /api/auth/login` — Login (all roles)
- `GET  /api/auth/me` — Current user
- `POST /api/auth/forgot-password` — Generate secure password reset token
- `POST /api/auth/reset-password` — Reset password using token

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
- `POST /api/admin/users` — Onboard new platform user (Admin-only)

### Diagnostics

- `GET  /api/health` — Basic health check
- `GET  /api/health/detailed` — Deep diagnostic health check (database, uptime, memory, storage)

### Marketplace

- `GET  /api/marketplace/listings` — Active listings (with price_trend, shortage_flags)
- `GET  /api/marketplace/price-history/:species` — 7-day price series
- `GET  /api/marketplace/listings/:id` — Listing detail
- `POST /api/marketplace/orders` — Place order (buyer auth required)
- `GET  /api/marketplace/stats` — Market overview stats
- `GET  /api/marketplace/activity` — Recent activity feed

---

## Further reading

- [CREDENTIALS.md](CREDENTIALS.md) — every seeded demo account.
- [DEPLOYMENT.md](DEPLOYMENT.md) — step-by-step Vercel + Render deploy notes.
- [SECURITY.md](SECURITY.md) — disclosure policy and hardening guarantees.
- [Docs/](Docs/) — design, requirements, uptime monitoring.
