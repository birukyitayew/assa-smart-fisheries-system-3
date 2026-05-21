#!/usr/bin/env bash
# Backup PostgreSQL database to backups/assa-YYYYMMDD.sql.gz
# Usage: DATABASE_URL=postgresql://... ./scripts/backup-db.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="${ROOT}/backups"
mkdir -p "$BACKUP_DIR"

if [ -z "${DATABASE_URL:-}" ]; then
  if [ -f "${ROOT}/backend/.env" ]; then
    set -a
    # shellcheck disable=SC1091
    source "${ROOT}/backend/.env"
    set +a
  fi
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: Set DATABASE_URL or configure backend/.env" >&2
  exit 1
fi

STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="${BACKUP_DIR}/assa-${STAMP}.sql.gz"

echo "Backing up to ${OUT}..."
pg_dump "$DATABASE_URL" | gzip > "$OUT"
echo "Done. Size: $(du -h "$OUT" | cut -f1)"
