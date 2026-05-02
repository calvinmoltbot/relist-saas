#!/usr/bin/env bash
# One-shot: file the four §6.1 immediate-lane issues from the 2026-05-02 PRD.
# Run when GitHub DNS is reachable. Idempotent label create; issues will
# duplicate if you run twice — only run once.

set -euo pipefail

REPO=calvinmoltbot/relist-saas

gh label create "ready-for-claude" --repo "$REPO" --color "0E8A16" \
  -d "Spec is clear, Claude can pick this up" --force >/dev/null 2>&1 || true

gh issue create --repo "$REPO" --label "ready-for-claude" \
  --title "Onboarding & empty states" \
  --body "$(cat <<'EOF'
A new sign-up sees blank dashboards everywhere. Add explicit empty states with a "what to do next" prompt on every primary surface, plus a sample-data toggle so a new user can see what the app looks like populated.

## Scope

- Empty-state copy on every list/dashboard surface that can be empty:
  - `/dashboard` (no items, no transactions)
  - `/inventory` ("Add your first item" CTA → `/inventory/new`)
  - `/expenses`
  - `/profit`, `/health`, `/bestsellers`, `/plan` — already partially done; audit and tighten
  - `/market` (no price data yet)
- Sample-data toggle in `/settings` (or its own page) — load a small set of sample items/transactions/expenses scoped to the current user, with a "remove sample data" button.
- First-run nudge on `/dashboard` if `items.count === 0` linking to inventory new + the extension setup.

## Why first

This is the §6.1 top item in the PRD. New users currently see scary blank pages and bounce — every other feature is wasted effort if they don't make it past the first screen.

## Acceptance

- New sign-up lands on `/dashboard` and immediately sees a clear "next step."
- Sample data can be loaded and cleared without touching real rows.
- No empty page reads as broken or under construction.

Refs PRD `~/shared/markviewer/relist-saas/2026-05-02-prd.md` §6.1.
EOF
)"

gh issue create --repo "$REPO" --label "ready-for-claude" \
  --title "Wire inventory list to use thumbnail endpoint" \
  --body "$(cat <<'EOF'
The thumbnail endpoint `/api/inventory/thumb/[id]` exists (user-scoped, ETag-cached) but `/inventory` doesn't render thumbnails. Cheap win on the most-loaded surface.

## Scope

- Add a thumbnail column / leading image to the `/inventory` list page rows.
- Source: `<img src="/api/inventory/thumb/{id}" />` with a fallback for items that have no thumbnail.
- Same for any other list-style surface that already shows item rows (dashboard top-profit table, plan tasks, etc.) — be conservative; only where a small image clearly helps recognition.
- Keep the layout responsive and don't blow up the row height.

## Acceptance

- Thumbnails render on `/inventory` for items that have photos, with a sensible placeholder when they don't.
- Repeat loads hit the cache (304 from ETag) — verify in dev tools.

Refs PRD §6.1.
EOF
)"

gh issue create --repo "$REPO" --label "ready-for-claude" \
  --title "Add user_settings table for per-user configurable targets" \
  --body "$(cat <<'EOF'
Three constants currently shimmed into the analytics layer should be per-user values backed by a `user_settings` table:

- \`STALE_LISTING_DAYS\` (currently 2) — used by daily plan reprice lane
- \`REFRESH_SUGGESTED_DAYS\` (currently 7) — used by health dead-stock cutoff
- \`WEEKLY_LISTINGS_TARGET\` (currently 10) — used by health cadence pace

## Scope

- New table \`user_settings\` (key/value, scoped by \`user_id\`):
  \`\`\`
  id, user_id, key (text), value (text), updated_at
  unique index (user_id, key)
  \`\`\`
- \`getSettings(userId)\` / \`getTargets(userId)\` helpers in \`src/lib/settings.ts\` returning typed object with defaults.
- Replace the constants in \`src/lib/analytics/health.ts\` and \`src/lib/analytics/daily-plan.ts\`.
- New \`/settings/targets\` page with a form to edit them. Default if unset.
- Drizzle migration via \`pnpm db:generate\` + verify postbuild migrate works.

## Why

PRD §6.1. Small migration, large unblock — needed before any further "how often is stale" / "what's our weekly target" UI work.

## Acceptance

- Targets persist per user, survive logout/login.
- Existing pages still work for users who haven't set anything (defaults kick in).
- \`scripts/tenancy-check.mjs\` is updated to assert no \`user_settings\` row has a NULL \`user_id\`.
EOF
)"

gh issue create --repo "$REPO" --label "ready-for-claude" \
  --title "Run tenancy-check.mjs in CI on every PR" \
  --body "$(cat <<'EOF'
\`scripts/tenancy-check.mjs\` verifies no domain row has a NULL \`user_id\` and that per-user separation holds across price_data / items / transactions / expenses / api_keys. It exists but isn't gated — nothing currently stops a PR from breaking the tenancy invariant.

## Scope

- New \`.github/workflows/tenancy.yml\` GitHub Action.
- Triggers on PRs to \`main\`.
- Sets up Node + pnpm, installs deps, exposes \`DATABASE_URL\` from a repo secret pointing at a **non-production** Neon branch.
- Runs \`node scripts/tenancy-check.mjs\` and fails the check on non-zero exit.
- Add to README / AGENTS.md a note that schema changes that introduce a new domain table must add it to the script's table list.

## Why

PRD §6.1. The tenancy invariant is the single most important property of this codebase — automated enforcement is overdue.

## Acceptance

- A PR that adds a domain table without \`user_id\` fails CI.
- A PR that breaks an existing user-scope filter fails CI.
- Branch protection on \`main\` requires this check (manual step in repo settings — flag this in the PR).
EOF
)"

echo "Done."
EOF
chmod +x /Users/admin/Dev/Projects/relist-saas/scripts/file-next-issues.sh 2>/dev/null
