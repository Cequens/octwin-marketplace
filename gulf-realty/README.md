# Gulf Realty — off-plan & ready property brokerage

A WhatsApp-first property consultant for Gulf brokerages. A buyer browses developments as
image cards, gets an indicative instalment in seconds, and books a site viewing with a real
advisor — and the brokerage gets a qualified lead with a funnel it can measure.

## What the buyer can do

| Journey | What happens |
|---|---|
| 🏙️ **Browse projects** | A carousel of developments — hero render, developer, handover, starting price. Filterable by city or budget. |
| 📋 **Project detail** | Payment plan, highlights and every available unit type in one card. |
| 🧮 **Finance estimate** | Picks a down-payment band and a tenor, gets an indicative monthly instalment — and becomes a lead. |
| 🗓️ **Book a viewing** | Advisor → live slot → party size → preview → ✅. Reminders land 24 hours and 2 hours before. |
| 📁 **My requests** | Their own viewings and enquiries, with status. |

Send an Emirates ID, passport or salary certificate and the bot reads it — name and income
are pre-filled instead of re-asked.

## What the brokerage gets

- **A measurable funnel.** `buyer_lead` runs `new → qualified → viewing_booked → offer_made → reserved`,
  so stage-by-stage conversion and drop-off are charted with no extra setup.
- **Milestones** on the three money moments: qualified, viewing booked, unit reserved.
- **A race-free viewing diary.** Advisor availability, capacity and the slot ledger are handled by
  the platform scheduling engine — two buyers cannot claim the same seat.
- **Operator-editable catalog.** Developments, unit types and advisors are records in the console;
  no redeploy to add a project.

## For the operator

Everything is in the console: **Records** for developments / unit types / advisors / leads,
**Bookings** for the viewing diary, and the pipeline funnel for `buyer_lead`.

## For the pack author

Pure YAML — no code, no pack database.

- `xrm.yaml` — the catalog (`development`, `unit_type`, `advisor`), the `buyer_lead` pipeline with
  milestones, and the `booking` system entity widened with two display snapshots.
- `scheduling.yaml` — makes `advisor` a bookable resource, 60-minute slots, T-24h/T-2h reminders,
  plus seeded demo availability.
- `flows/tools/*.flow.yaml` — six flows. The two worth reading are `book-viewing` (a `collect:`
  with fetched pickers → `approve_apply` → `booking_reserve` → `schedule_notify`) and
  `mortgage-estimate` (every numeric input arrives through a picker `selection:`, so the arithmetic
  never touches free text).
- `manifest.yaml` — `inbound_preprocessing` turns on document vision and voice-note transcription
  with no flow at all.

Seed the demo catalog (four developments with AI-generated renders, five unit types, three
advisors with availability) with `octwin deploy --seed`.
