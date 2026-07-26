# Smile Dental — a dental clinic with a rating that actually counts

A WhatsApp front desk for a dental clinic. A patient reads the price list, picks a dentist,
takes a real slot from a real diary, gets reminded, and rates the visit afterwards — and that
rating changes which dentist the *next* patient is offered first.

## What the patient can do

| Journey | What happens |
|---|---|
| 🦷 **Treatments & prices** | The price list as a tappable menu — starting price, duration, and whether insurance usually covers it. Tapping a row starts a booking for it. |
| 👩‍⚕️ **The dentists** | Portrait cards with specialty and patient rating, **ordered by that rating**. |
| 🗓️ **Book a visit** | Treatment → dentist → a real free slot → preview → ✅. Reminders land 24 hours and 2 hours before. |
| 📋 **My visits** | Their appointments and status, a cancel that frees the slot, and a ⭐1–5 rating. Type a comment afterwards and it attaches to the same rating. |

Send a photo of an insurance card and the bot reads it — insurer and member number are
pre-filled instead of re-asked.

## The rating loop (the interesting part)

This is a closed loop with **no bespoke SQL anywhere**:

1. The ⭐ tap submits the `visit_feedback` survey against the **booking**.
2. Because a survey's subject is the booking, the rated *dentist* isn't derivable from the
   response — so the flow **stamps it** onto the response.
3. `record_aggregate` averages every response carrying that dentist, and counts them.
4. The average is written back onto the dentist record.
5. The dentist picker is a `record_search` with `rank_by: rating` — so it re-orders.

A second submit for the same visit **patches the same response** (the upsert is on
survey_key + subject_ref), which is how the stars can come from a tap and the comment from the
patient's next message without creating two responses.

> The seeded ratings are illustrative. Once a real response exists, the rollup is authoritative
> and replaces the seeded number with the average of actual feedback — which is the correct
> behaviour for a live clinic, if a little abrupt in a demo.

## What the clinic gets

- **A race-free diary.** Availability, capacity and slot expansion are the platform scheduling
  engine's; reservation is a single conditional upsert, so two patients tapping the same slot
  cannot both win.
- **Reminders that reduce no-shows**, scheduled from the offsets in `scheduling.yaml`.
- **Feedback that steers demand** to the dentists patients actually rate highly.
- **A clinical boundary the bot cannot cross** — see the prompt: no diagnosis, no urgency
  assessment, no price from memory.

## For the pack author

Pure YAML — no code, no pack database.

- `scheduling.yaml` — dentists as bookable resources, single-capacity chairs, T-24h/T-2h
  reminder offsets, and seeded demo availability.
- `surveys.yaml` — one questionnaire, `subject: booking`, `score: stars`.
- `xrm.yaml` — `booking` and `survey_response` both widened via `extends: system` (adding
  fields only), and `dentist.rating` documented as a rollup target rather than a hand-typed field.
- `flows/tools/my-visits.flow.yaml` — the rating loop, with the whole chain commented.
- `flows/tools/book-visit.flow.yaml` — `collect:` with fetched pickers → `approve_apply` →
  `booking_reserve` → `schedule_notify`. Note the `not_found` guard that drops a stale dentist id
  so the picker re-engages rather than calling `slot_list` on a dead resource.

```bash
octwin deploy --seed
octwin chat "كم سعر التبييض؟" --as tester
octwin scheduling --slots <dentistRecordId>
octwin records survey_response
```
