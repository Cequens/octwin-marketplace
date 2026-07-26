# MotorCare Service — a photo becomes a job card

A WhatsApp service desk for a car service centre. A customer photographs the dent, the warning
light or the leak; the bot reads the photo, tells them what is *visible* and which department
it belongs to, and opens a **real job card in that department's queue** with an SLA clock
running. A foreman works it in the console and every decision reaches the customer as a message.

## What the customer can do

| Journey | What happens |
|---|---|
| 📸 **Triage by photo** | Plate → complaint → photo. The platform reads the image, the flow opens a routed job card, and the customer gets a factual "what we can see" card — **never a price**. |
| 🔧 **Service packages** | The menu as workshop-photo cards with starting prices and duration. |
| 🗓️ **Book a bay** | Package → bay (only bays in the right department are offered) → a real free slot → preview → ✅. Reserving the slot also opens the job card, so the diary and the shop floor cannot disagree. |
| 🚗 **My garage** | Their vehicles, every job card's stage, and a plain-language "what happens next". |

## What the centre gets

- **A workshop queue, not an inbox.** `repair_job` is routed by its `work_area` field —
  mechanical / body / diagnostics — with per-type SLAs (4h for a breakdown, 8h for a diagnostic,
  48h for body work) and a `service_desk` fallback so nothing strands unrouted.
- **Dispositions that talk to the customer.** `quote_ready` (with the amount), `parts_ordered`
  (with an ETA), `ready_for_collection`, `declined_by_customer` — each relays automatically.
- **A vehicle history** deduped on plate, so a returning customer never re-enters their car.
- **A funnel** on `repair_job` (`received → inspecting → quoted → in_repair → ready →
  collected`) with milestones on quoted and collected.

## For the pack author

Pure YAML — no code, no pack database. This is the reference pack for **worklist without
casework**: the same queue / SLA / assignee / disposition engine applied to a job card rather
than a support ticket. Note `worklist.yaml` uses `route_by` + an explicit `map`, not a static
queue.

Two design notes worth reading in the flows:

- **`damage-check`** explains why it does *not* call `analyze_image` as a second pass.
  `analyze_image` takes a URL or data URL, and the media URL a self-hosted platform serves is
  not reachable from a remote inference provider — so the analysis silently returns empty. The
  manifest's `inbound_preprocessing.image` hands the model the **bytes** instead: it is both the
  working path and one vision call rather than two. The flow accepts the extracted fields as
  optional inputs and **defaults to `diagnostics`** when the agent supplies none — which routes
  the job to a human rather than guessing.
- **`book-service`** filters the bay picker by the package's own `work_area`, so a paint job can
  never be booked onto a mechanical lift, and `auto_resolve` skips the tap when a department has
  one bay. The `booked_no_job` branch exists because the slot is real even if the job card
  failed — the customer is told the truth either way.

```bash
octwin deploy --seed
octwin chat "في خدش في الباب" --media ./damage.jpg --as tester
octwin scheduling --slots <bayRecordId>
octwin analytics repair_job --funnel
```
