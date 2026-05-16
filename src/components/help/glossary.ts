/**
 * Short, plain-English explainers for jargon that shows up across the app.
 *
 * Keyed by a stable slug so callers (`<HelpDot term="sourced" />`) stay
 * one-liners. Add a new term here, then drop a HelpDot wherever the
 * label appears. Keep copy to a single sentence — these render in a
 * small floating tooltip and need to read at a glance.
 *
 * Vinted has no seller fees (see AGENTS.md), so there is intentionally
 * no `fees` entry.
 */
export const GLOSSARY = {
  sourced: {
    label: "Sourced",
    description:
      "You've got it in hand but haven't listed it on Vinted yet — it's waiting to go up.",
  },
  listed: {
    label: "Listed",
    description:
      "Live on Vinted right now and visible to buyers — no offer accepted yet.",
  },
  sold: {
    label: "Sold",
    description:
      "A buyer has paid — you still need to pack and ship it for the sale to complete.",
  },
  shipped: {
    label: "Shipped",
    description:
      "Handed off to the courier — the sale is on its way to the buyer.",
  },
  "bought-vs-own": {
    label: "Bought vs Own",
    description:
      "Bought = you paid to source it for resale. Own = something already in your wardrobe; cost is treated as £0.",
  },
  "vinted-url": {
    label: "Vinted URL",
    description:
      "Paste the link to your item's public Vinted listing so you can jump straight to it from here.",
  },
  "cost-price": {
    label: "Cost price",
    description:
      "What you paid to source the item, before shipping or any prep costs.",
  },
  status: {
    label: "Status",
    description:
      "Where this item is in its journey: Sourced → Listed → Sold → Shipped.",
  },
} as const;

export type GlossaryTerm = keyof typeof GLOSSARY;
