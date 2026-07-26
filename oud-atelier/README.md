# Oud Atelier — a luxury perfume boutique in chat

A WhatsApp storefront for an oud and perfume house. A shopper who knows what they want
searches for it in their own words; a shopper who doesn't takes a three-tap quiz and gets a
recommendation. Either way they build a cart, review a delivery summary, and confirm — and the
boutique gets an order record, a fulfilment funnel, and decremented stock.

## What the shopper can do

| Journey | What happens |
|---|---|
| 🛍️ **Browse / search** | Their own words are embedded and searched **semantically** against the catalog. Results come back as an image carousel with add-to-cart on the card. |
| 🔎 **Fragrance quiz** | Scent family → occasion → budget. The three answers compose a natural-language brief that the semantic search answers — so a newly added product gets recommended with **no edit to the quiz**. Over budget? It widens once rather than dead-ending. |
| 📋 **Product detail** | Full copy, price, scent notes, longevity, and live stock. |
| 🛒 **Cart & checkout** | Add / remove / clear, then recipient → city → address → payment, a preview card, and an explicit ✅. Nothing is written before that tap. |
| 📦 **Orders** | Their own order history and one order's items, total, delivery address and stage. |

## What the boutique gets

- **A fulfilment funnel.** `purchase` runs `placed → packed → shipped → delivered`, so the console
  charts stage-by-stage conversion with no extra setup, plus milestones on placed and delivered.
- **Stock that moves.** Confirming an order decrements each item's stock, and a `low_stock`
  segment surfaces anything at five or fewer.
- **An operator-editable catalog.** Add a fragrance in the console and both the search and the
  quiz pick it up immediately.
- **No accidental orders.** The order record only exists after the shopper's ✅.

## For the pack author

Pure YAML — no code, no pack database, no migrations. Three entities carry the whole boutique:
`fragrance` (the catalog), `cart_line` (contact-scoped, one row per SKU), `purchase` (the
pipeline).

**Why not the platform `product`/`cart`/`order` commerce entities?** Two constraints meet: an
external pack may ship only text (`.yaml`/`.md`/`.sql`), so `commerce_catalog_seed` — which
uploads *committed image files* — cannot carry photography; and a `demo:` seed validates rows
against the **pack's** declared fields, while an `extends: system` entity may only ADD fields,
never restate `product.name`/`price`. So a demo row cannot fill a system entity. The pack's own
`fragrance` entity sidesteps both: its `photo` is a real `image` field seeded with a
`generate:` prompt, which is **portable** — the imagery is produced on the installing tenant's
own workspace at `--seed` time, and the pack stays text-only. A boutique that later syncs a
Meta catalog swaps `shop` over to the commerce primitives without touching the rest.

Worth reading:

- `xrm.yaml` — the three entities, `search: { semantic: [...] }` (what makes the quiz work), the
  pipeline + milestones, and the `generate:` demo seed.
- `flows/tools/cart.flow.yaml` — a `dispatch:` router, an upsert-on-`dedupe_by` add, and a
  `collect:` → `approve_apply` → write → `foreach` stock-decrement commit path. Two comments in
  it record real gotchas: `$filter`'s predicate is a field path (not a per-row expression), and a
  `record` field's value is not a plain `record_id` — resolve it by `dedupe_by` instead.
- `flows/tools/fragrance-finder.flow.yaml` — a `collect:` whose `derive:` block turns three taps
  into one sentence.

Drive it headlessly:

```bash
octwin deploy --seed
octwin chat "أبحث عن عود ثقيل للأعراس" --as tester
octwin chat --tap "t:invoke:fragrance-finder" --as tester
octwin records fragrance
octwin analytics purchase --funnel
```
