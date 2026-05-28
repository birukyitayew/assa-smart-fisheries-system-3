# ASSA Security Controls

This document maps production security measures to the OWASP-oriented checklist in the project PRD.

## Authentication & sessions

| Control          | Implementation                                                                          |
| ---------------- | --------------------------------------------------------------------------------------- |
| Password hashing | bcrypt (cost factor 10) via `bcryptjs`                                                  |
| Access tokens    | Short-lived JWT (`JWT_ACCESS_EXPIRES_IN`, default 30m)                                  |
| Refresh tokens   | Opaque tokens; SHA-256 hash stored in `refresh_tokens`; rotation on `/api/auth/refresh` |
| Logout           | Revokes refresh token(s) in database                                                    |
| Login rate limit | 10 attempts / 15 min per IP on `POST /api/auth/login`                                   |
| Account lockout  | 5 failed logins → 15 min lock (`users.failed_login_count`, `locked_until`)              |

## Authorization

- Role-based access: `admin`, `superadmin`, `inspector`, `fisher`, `buyer`
- Route middleware enforces role checks on admin, fisher, marketplace, and inspector paths

## Transport & headers

- Helmet security headers (production)
- CORS: explicit `CORS_ORIGINS` required in production (no localhost fallback)
- `trust proxy` enabled for correct client IP behind Render/Fly

## Input & data

- JSON body limit: 1 MB
- Express-validator on catch submission and other mutation endpoints
- Prisma parameterized queries (no string-concatenated SQL in application code)

## Audit & integrity

- Immutable-style audit log on key mutations (`audit_log` table)
- Domain events for SSE replay buffer

## Secrets

- `JWT_SECRET`, `DATABASE_URL`, and provider keys via environment variables only
- `.env` is gitignored; use `.env.example` as a template
- Never commit `JWT_SECRET=change_me` in real deployment env files

## Dependencies

- CI runs `npm audit --audit-level=high` on root and backend

## Backups

- `scripts/backup-db.sh` — `pg_dump` to `backups/` (gitignored)
- Neon: enable point-in-time recovery in the Neon console for production

## Deployment notes

- Run API on a **long-running** host (Render/Fly), not serverless, so in-process SSE continues to work
- Rotate `JWT_SECRET` and database credentials if exposure is suspected
- Revoke all refresh tokens for a user via logout-all or DB update on incident response
