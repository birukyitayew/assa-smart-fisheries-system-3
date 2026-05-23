#!/usr/bin/env bash
# Opens a PR for the UI/theme/responsive fix (commit 0c17861).
# Required when that commit was pushed directly to main but you still want a reviewable PR.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

BASE_SHA="a4265a9"
FEAT_BRANCH="feat/ui-responsive-theme"
GH_BIN="${GH_BIN:-gh}"

if ! command -v "$GH_BIN" >/dev/null 2>&1; then
  echo "Install GitHub CLI (gh) or set GH_BIN to its path."
  exit 1
fi

if ! "$GH_BIN" auth status >/dev/null 2>&1; then
  echo "Run: gh auth login"
  exit 1
fi

git fetch origin

# Feature branch at the fix commit (current main tip)
git checkout -B "$FEAT_BRANCH" origin/main
git push -u origin "$FEAT_BRANCH"

# Roll main back one commit so the PR has a real diff (safe if you are the only one on main)
echo "Resetting origin/main to $BASE_SHA (before the UI fix) for PR review..."
git checkout main
git reset --hard "$BASE_SHA"
git push --force-with-lease origin main

"$GH_BIN" pr create \
  --base main \
  --head "$FEAT_BRANCH" \
  --title "fix(ui): responsive admin layout, theme toggle, and PostgreSQL intel queries" \
  --body "$(cat <<'EOF'
## Summary
- Fix PostgreSQL errors on Market Intelligence (`ROUND(...::numeric)`, valid `HAVING` on aggregates).
- Add light/dark/system theme to admin dashboard, fisher app, and marketplace.
- Responsive admin layout: mobile sheet navigation, desktop sidebar, shared grid utilities.
- Fix Market Monitor horizontal overflow on narrow screens (scrollable tab strip).

## Test plan
- [ ] `npm run dev` — sign in at http://localhost:3001/admin/login (`dawit@fisheries.gov.et` / `admin123`)
- [ ] Open **Market Intelligence** — page loads without SQL error
- [ ] Resize to ~390px — hamburger visible, sidebar hidden; open **Market Monitor** — no sideways page scroll, tabs scroll horizontally
- [ ] Desktop (≥1024px) — sidebar visible, hamburger hidden
- [ ] Toggle theme (light / dark / system) on login and dashboard
EOF
)"

echo "Done. Review and merge the PR to restore the fix on main."
