# SwiftShip Courier — tracking that never guesses

A WhatsApp support desk for an Egyptian courier. Customers track a parcel, book a collection
priced from the live rate card, and raise a claim that a real claims officer decides.

## What the customer can do

| Journey | What happens |
|---|---|
| 🔍 **Track** | A waybill lookup that reports the record's own stage, its plain-language explainer, the last scan, the recipient and any cash to collect. Arabic-Indic digits and stray spaces are normalised first, so a valid number is never reported as unknown. |
| 🚚 **Book a pickup** | Service → route → weight band → address → window, priced from a `rate` record. If no rate covers the route, the request is taken **unpriced** and the desk prices it — no invented figure. |
| ⚠️ **Raise a claim** | Late / damaged / lost / wrong address. Opens a real ticket with the real SLA quoted back. |
| 🎫 **My tickets** | Every ticket's status and the decision the desk recorded. |

## The two design rules

**1. Never answer a status from memory.** `track` is the only source, and there is no branch in
it that lets the agent narrate a stage it did not read. An unknown waybill is reported as
unknown, with the number read back — not softened into "probably in transit".

**2. Never promise compensation.** A damaged or lost parcel becomes a `case`; the claims desk
reviews it against policy and picks `compensation_approved` with an amount, which relays to the
customer automatically. The agent may state the ticket number and the SLA, nothing more.

## Routing that infers rather than asks

Damage and loss go to one central `claims_desk` — one policy, one team. A **late delivery or a
wrong address is a regional problem**, so those case types `route_by: region`, and the region is
read off the shipment record rather than asked. Report a late parcel in Mansoura and the ticket
lands with `ops_delta` on an 8-hour SLA, with nobody typing a region.

## For the pack author

Pure YAML — no code, no pack database.

- `xrm.yaml` — `shipment.dedupe_by: tracking_number` is what makes `record_get match:` work as a
  waybill lookup, and the demo seeds shipments at **different stages** (including a failed
  attempt) so `track` has something honest to report.
- `flows/tools/track.flow.yaml` — note `$normalize_digits` + `$trim` + `$upper` before the
  lookup, and `all: true` (a waybill is looked up by number, not by who is asking, so a
  recipient can track a parcel a shop sent them).
- `flows/tools/claim.flow.yaml` — an unknown waybill must **not** block a claim (a customer whose
  parcel never arrived may not have a valid number at all), so the `not_found` port is an
  intentional no-op.
- `flows/tools/book-pickup.flow.yaml` — two `approve_apply` paths: priced and unpriced.
- `locale.ar.yaml` — the casework locale contract plus the tracking `stage_hint.*` explainers.

```bash
octwin deploy --seed
octwin chat "شحنتي فين؟ SS100200304" --as tester
octwin cases --queues
```
