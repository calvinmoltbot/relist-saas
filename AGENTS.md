<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Schema changes

When introducing a new domain table that is scoped per-user, you **must** add it to the table list in `scripts/tenancy-check.mjs` so the isolation/null-user-id check covers it.

The `Tenancy Check` GitHub Actions workflow (`.github/workflows/tenancy.yml`) runs `node scripts/tenancy-check.mjs` on every PR to `main`. Branch protection on `main` requires the `Run tenancy-check.mjs` status check to pass — merges are blocked if it fails.

The `TENANCY_CHECK_DATABASE_URL` repo secret should point at a **non-prod Neon branch**, never the production database. After applying a Drizzle migration to prod, also run `pnpm db:migrate` against the CI branch so the tenancy check has the latest schema to scan.

## Sign-up access

Sign-up is **invite-only**. Public sign-up is disabled in the Clerk dashboard, and the marketing page does not surface a sign-up CTA — only sign-in plus a note explaining access is by invitation.

To grant access, send a Clerk Invitation from the dashboard (Users → Invitations → Invite). Do not re-introduce a public `/sign-up` route, a `<SignUp />` component, or a `SignUpButton` without a deliberate decision to open registration.

## Domain map (do NOT touch Lily's sites)

| Subdomain | What it is | Allowed actions |
|---|---|---|
| `relist-saas.warmwetcircles.com` | **This** project's production URL — the only canonical URL for end-user testing. | Deploy, alias, configure freely. |
| `relist.warmwetcircles.com` | **Lily's live ReList production site** (legacy `~/Dev/Projects/relist`, repo `calvinmoltbot/relist`). | Read-only. Never deploy, alias, push, or share an alias collision. |
| `vinted.warmwetcircles.com` | Earlier brainstorming session built for Lily. | Read-only. Off-limits the same way. |

Before proposing or registering ANY new subdomain on `warmwetcircles.com`:
- Ask Calvin to confirm the name. `vercel domains inspect` is not authoritative — Lily's sites may not appear in this project's CLI scope.
- Never reuse a name that reads as Lily's (`relist`, `vinted`, anything else she owns) for a relist-saas URL.

Use **only** `relist-saas.warmwetcircles.com` in conversation, docs, and PRs. Vercel preview URLs (`relist-saas-git-...vercel.app`) are for build verification only, not for sharing with Calvin — they create separate Clerk session contexts and cause "where did my data go?" confusion.

## Design constraints

### No-scroll rule (desktop)

Primary app surfaces — Dashboard, Inventory list, Item detail, Profit, Health, Bestsellers, Plan — must fit a **1280 × 800** viewport without vertical page scroll on first load. If content can't fit, redesign first: denser layout, collapsed sections, a scrollable inner region (e.g. a table inside a fixed-height card), or a tabbed split. Page scroll is a last resort, not the default.

Mobile is exempt — issue #30 owns the responsive pass and natural mobile scrolling is fine. Modals, drawers, and forms past their initial revealed state may scroll internally.

When implementing or reviewing a UI change, verify against 1280 × 800 before opening the PR. If the page now scrolls, the change isn't done.

### Vinted has no seller fees

This app is Vinted-only and Vinted **does not charge sellers any fees** — no listing fee, no transaction fee, no payout fee. The product must reflect that:

- **Sale forms** (Mark as sold, item edit) must NOT ask for a "fees" amount. Sold price and shipping cost are the only sale inputs.
- **Profit calculations** treat fees as zero. Don't show a "fees" line in tiles, breakdowns, or charts.
- **Expense categories** must NOT include a `platform_fee` option.
- **Sample data** must NOT seed fee values.

The `transactions.platformFees` column in the schema is retained as a dead, default-zero field — do not surface it, but don't drop it in a migration either (low value, migration risk). New code paths should ignore it.

### Cost handling

Items have an `acquisitionType` of `bought` or `own`. **`own` items always treat cost as 0** — the new-item form hides the cost field for them, and completeness checks do not flag missing cost. Anywhere cost is read for math, route through `coerceMoney()` from `src/lib/money.ts` so null and missing values become 0 cleanly. Reporting splits bought vs own (issue #46) — never blend them when showing a "profit margin" %.
