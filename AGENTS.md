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

