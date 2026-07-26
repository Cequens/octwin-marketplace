# Glamour Salon — booking that respects how long the work takes

A WhatsApp front desk for a ladies' salon and spa in Riyadh. Clients browse the treatment
menu, pick a specialist, take a real slot, get reminded, and rate the visit — and that rating
re-orders which specialist the next client is offered first.

## What the client can do

| Journey | What happens |
|---|---|
| 💅 **Treatments** | Salon-photo cards with the price **and the real duration** — a keratin job is four hours and the card says so. |
| 👩‍🎨 **The team** | Portrait cards ordered by client rating; only specialists who do the chosen category are ever offered for it. |
| 📅 **Book** | Treatment → specialist → slot → preview → ✅, with a reminder the day before. |
| 🗓️ **My visits** | Their appointments, a cancel that frees the chair, and a ⭐1–5 rating. A comment typed afterwards attaches to the same rating. |

## The rating loop

Stars → the response is stamped with the specialist it was about (a survey's subject is the
*booking*, so the specialist isn't derivable from the response) → `record_aggregate` averages
every response for her → the average is written back → the picker's `rank_by: rating` re-orders.
A second submit for the same visit patches the same response, so stars and comment never
duplicate.

## An honest limit, and how this pack handles it

`booking_reserve` claims **the slot it is given**. Passing a longer `slot_minutes` records the
true treatment length on the booking, but it does **not** consume the following grid slots — a
four-hour treatment on a 30-minute grid leaves the next 30 minutes bookable underneath it.
(Verified: after a 240-minute reservation, `octwin scheduling --slots` shows only the start slot
at `0/1`.)

So this pack does not rely on duration to protect the diary. Instead **each specialist's grid
step matches the length of the work she actually does** — 120-minute slots for colour and
keratin, 90 for facials and nails, 240 for bridal — which makes one claimed slot equal one real
appointment. A salon whose treatments vary more widely should split the long work onto its own
resource. The duration is still recorded and shown, because the salon needs it; it just isn't
what enforces the diary.

## What the salon gets

- **A diary that cannot double-book**, because one slot is one appointment.
- **Feedback that steers demand** to the specialists clients rate highly.
- **Chairs recycled** — a cancel in chat frees the slot immediately.
- **A boundary the bot cannot cross** — no promised results, no dermatological or pregnancy
  advice; a mentioned condition is noted on the booking and referred to the specialist.

## For the pack author

Pure YAML — no code, no pack database.

- `scheduling.yaml` — read the note at the top; it documents the limit above and why the grid is
  per-specialist rather than uniform.
- `flows/tools/book-appointment.flow.yaml` — the specialist picker filters on a `multi_select`
  with the **`has`** op (`eq` would only match a specialist whose entire specialty list is that
  one value).
- `flows/tools/my-visits.flow.yaml` — the rating loop, fully commented.

```bash
octwin deploy --seed
octwin chat "أبحث عن موعد صبغة" --as tester
octwin scheduling --slots <stylistRecordId>
octwin records survey_response
```
