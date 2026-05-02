<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Schema changes

When introducing a new domain table that is scoped per-user, you **must** add it to the table list in `scripts/tenancy-check.mjs` so the isolation/null-user-id check covers it.

The `Tenancy Check` GitHub Actions workflow (`.github/workflows/tenancy.yml`) runs `node scripts/tenancy-check.mjs` on every PR to `main`. Merges should be blocked if it fails — this is enforced via branch protection on `main`, which must be configured manually in repo settings (Settings → Branches → Branch protection rules → require status check `tenancy-check`).

The `TENANCY_CHECK_DATABASE_URL` repo secret should point at a **non-prod Neon branch**, never the production database.

