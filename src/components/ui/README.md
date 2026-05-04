# Relist design system

Visual primitives shared across pages. Token values live in
`src/app/globals.css` — components reference them via CSS custom
properties so any future palette tweak is one file.

## Tokens

### Surfaces

| Token              | Use                              |
|--------------------|----------------------------------|
| `--surface-canvas` | Page background (warm cream)     |
| `--surface-card`   | Cards, tiles                     |
| `--surface-muted`  | Tinted muted surface             |
| `--surface-inset`  | Inputs, sub-cards                |

### Brand & accents

| Token            | Hex     | Use                                  |
|------------------|---------|--------------------------------------|
| `--brand`        | #0f766e | Primary CTAs, "Listed" status        |
| `--accent-amber` | #f59e0b | "Sourced" status, warnings           |
| `--accent-violet`| #7c3aed | "Sold" status                         |
| `--accent-slate` | #475569 | "Shipped" status                      |
| `--accent-emerald`| #059669| Positive money, "good" health band   |
| `--accent-rose`  | #f43f5e | Destructive, negative money, "bad"   |
| `--accent-blue`  | #2563eb | Info / neutral highlight              |

Each accent has a `*-soft` (background) and `*-soft-fg` (text)
companion token for filled pill / chip styles.

### Typography

- **Display** — Fraunces (variable, optical sizing). Use `.font-display`
  on h1 / large numerics. Loaded via `next/font` in the root layout.
- **Body / UI** — Inter. Default body font.

### Radii

`--radius-sm` 6 · `--radius-md` 10 · `--radius-lg` 14 · `--radius-xl` 20.

### Elevation

`--elev-1` (cards) · `--elev-2` (raised) · `--elev-3` (overlay).

## Components

All exported from `@/components/ui`.

### `<Tile>`
Metric tile. Supports icon chip, sub-label, trend delta, and inline
sparkline. Used on Dashboard, Profit, Health, Bestsellers, Expenses.

### `<StatusPill status="listed" />`
Item-status badge. Maps `sourced | listed | sold | shipped` to the
canonical colour. Always use this — never inline status colours.

### `<Card>` + `<CardHeader>`
Generic surface for grouped content.

### `<Button>` / `<ButtonLink>`
Variants: `primary | secondary | ghost | destructive`.
Sizes: `sm | md`. Use `ButtonLink` for navigational actions.

### `<PageHeader>`
Standard page title + subtitle + actions row.

### `<Sparkline>`
Recharts wrapper for small inline area charts. Client component.

## Live preview

Sign in and visit **`/design-system`** to see every token and primitive
rendered together — useful when tweaking values or reviewing changes.
