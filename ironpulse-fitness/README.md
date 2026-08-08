# IronPulse Fitness — class seats that really run out

A WhatsApp front desk for a fitness club. Members browse the timetable, book a seat in a class,
cancel when life happens, and prospects take a free trial that the club can actually measure.

## The capacity story (why this pack exists)

Most booking bots model an appointment: one person, one slot. **A class is twenty seats in one
slot**, and that changes everything:

- Each availability rule declares the real room capacity — 20 mats for spin, 10 for barbell work.
- The slot list shows the **remaining** count, so a member watches a class filling up
  ("متبقٍ 10 مقعد").
- Reservation is a single conditional upsert against the platform's capacity ledger, so two
  people tapping the last mat at the same instant cannot both win — one gets the seat, the other
  gets the `full` port and a graceful "pick another time" card.

Verify it from the terminal: book a seat, then `octwin scheduling --slots <trainerId>` shows
`9/10 free`.

## What the member can do

| Journey | What happens |
|---|---|
| 🏋️ **Timetable** | Studio-photo cards, ordered by how well attended each class is, filterable by discipline or intensity. |
| 📅 **Book a seat** | Class → trainer (**only trainers who teach that discipline are offered**) → a slot with its real remaining seats → preview → ✅. Reminders land 24 hours and 2 hours before. |
| 🎫 **Membership** | Goal → experience → the plan list. The enquiry is captured as a tracked lead, and a plan tap books the free trial — with the tapped plan filed on the lead. |
| 🗓️ **My classes** | Their bookings, past ones included, and a cancel behind a confirmation that returns the seat to the pool and revokes both reminders. |

## What the club gets

- **A sales funnel it can measure** — `member_lead` runs `enquiry → trial_booked →
  trial_attended → member`, with milestones on trial booked and joined. Trial-to-member
  conversion comes free from the pipeline, with nobody typing into a CRM.
- **No oversold classes**, structurally.
- **Seats recycled** — a cancel in chat frees the mat immediately.
- **A boundary the bot cannot cross** — the prompt forbids prescribing training, diet or
  supplements, and routes any mention of injury or a medical condition to a human.

## For the pack author

Pure YAML — no code, no pack database.

- `scheduling.yaml` — the multi-capacity resource. A per-rule `capacity:` is the whole mechanism;
  there is no pack-wide default, so **every rule sets its own**, and it must equal the `seats` on
  the matching class in `xrm.yaml` — that is the number the timetable card advertises, and nothing
  reconciles the two automatically.
- `flows/tools/book-class.flow.yaml` — the trainer picker is filtered by the *class's* discipline
  (carried forward through the picker's `selection:`), the slot label surfaces `$item.remaining`
  from the engine row, and the `full` port renders a real "pick another slot" card rather than an
  error. A trial booking also advances `member_lead` to `trial_booked` — the sales event.
- `flows/tools/membership.flow.yaml` — a `collect:` that captures the lead *before* showing
  prices, so an abandoned enquiry is still a lead.

```bash
octwin deploy --seed
octwin chat "عندكم حصص يوجا؟" --as tester
octwin scheduling --slots <trainerRecordId>
octwin analytics member_lead --funnel
```
