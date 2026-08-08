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

## How the duration actually protects the diary

`booking_reserve` claims **every grid slot the treatment covers** and refuses a start whose span
would run past closing time. So the treatment's own `duration_min` is what holds the chair: a
three-hour colour at 16:00 takes 16:00, 17:00 and 18:00 off the board, and 18:00 is not offered
at all on a day that closes at 20:00.

That makes the grid step nothing more than **arrival granularity**, so every specialist runs on a
uniform 60-minute step and a one-hour cut can start at 11:00 rather than waiting for a two-hour
boundary.

Both halves of the booking must be told the duration. The picker passes it to `slot_list` as
`fits_minutes`, which keeps a start with too little room behind it off the list; `booking_reserve`
gets the same number and enforces it. Passing it to only one is a live defect — it offers a time
and then refuses it *after* the client has confirmed. This pack shipped that bug until
`1.2.0`; it is recorded in the repo [`BACKLOG.md`](../BACKLOG.md).

## What the salon gets

- **A diary that cannot double-book**, because one slot is one appointment.
- **Feedback that steers demand** to the specialists clients rate highly.
- **Chairs recycled** — a cancel in chat frees the slot immediately.
- **A boundary the bot cannot cross** — no promised results, no dermatological or pregnancy
  advice; a mentioned condition is noted on the booking and referred to the specialist.

## For the pack author

Pure YAML — no code, no pack database.

- `scheduling.yaml` — read the note at the top; it documents why the grid is uniform arrival
  granularity and not appointment length.
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
