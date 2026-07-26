# Shawarma Express — delivery orders, and a basket that chases itself

A WhatsApp counter for a Cairo shawarma restaurant. The customer browses a photo menu, builds a
basket, gives delivery details, confirms, and tracks the order — and if they wander off
mid-basket, the platform nudges them **on its own**, with no flow and no turn.

## What the customer can do

| Journey | What happens |
|---|---|
| 🌯 **Menu** | Food photography as a carousel, filtered by section or by the bestsellers segment. Only dishes the kitchen has marked available are ever offered. |
| 🛒 **Basket** | Add / remove / clear. A second add of the same dish updates the quantity rather than stacking a line. |
| ✅ **Checkout** | Name → area → address → payment, with the **delivery minimum enforced** and the delivery fee added before the customer confirms. The nearest branch covering their area is picked automatically. |
| 🛵 **Track** | Every order's stage with a plain-language "what happens next". |

Send a voice note and the platform transcribes it — the order is read out of the transcript
instead of being dictated twice.

## The automation (the part with no conversation in it)

`automation.yaml` declares two standing jobs that run on the platform ticker:

- **`basket_nudge`** — a basket idle for a day gets one message, and at most one more every 48
  hours. The `cooldown_hours` is the whole point: without it a segment job would message the
  same customer on every tick.
- **`stale_order_sweep`** — an order nobody moved out of `placed` within a day transitions to
  `cancelled`, so the kitchen board and the funnel stay honest. The rule itself lives on the
  entity (`auto_transition` in `xrm.yaml`), not duplicated in the job — the data owns its own
  staleness policy.

## What the restaurant gets

- **A delivery funnel** — `placed → preparing → out_for_delivery → delivered` with milestones
  on placed and delivered, charted per stage with no extra setup.
- **Branch routing** by the customer's area, with a graceful "nearest branch, desk decides"
  fallback so an uncovered area never loses the order.
- **An editable menu** — mark a dish unavailable in the console and the bot stops selling it
  immediately.
- **No under-minimum orders and no accidental orders** — both are structural, not prompt advice.

## For the pack author

Pure YAML — no code, no pack database.

- `automation.yaml` — the two jobs above; `interval_seconds` has a 60s floor.
- `xrm.yaml` — note `auto_transition` on the `food_order` pipeline (what `stale_records` reads)
  and the `bestsellers` **segment**, which `menu` calls by name so the kitchen can redefine
  "popular" without a deploy.
- `flows/tools/basket.flow.yaml` — the minimum-order gate is an `answer` (a business rule stated
  warmly), not an error card; `$filter_gte` is used rather than `$filter` because `$filter`'s
  predicate is a field path, not a per-row expression.
- `config:` in `manifest.yaml` holds the fee and minimum, so a branch manager changes a number
  rather than a flow.

```bash
octwin deploy --seed
octwin chat "عايز شاورما فراخ" --as tester
octwin analytics food_order --funnel
```
