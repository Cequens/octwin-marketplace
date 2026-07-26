# Nile Academy — an admissions funnel that is actually real

A WhatsApp admissions office for a private academy in Cairo. Guardians compare programmes and
fees, book a campus tour, and start an application — and the registrar gets a funnel they can
report on without anyone typing into a spreadsheet.

## Milestones, not just stages

A registrar does not need a list of stages; they need *how many reached assessment this intake,
and where we lose them*. So each money moment is a declared `milestone:` fired by the flow that
causes it:

| Milestone | Fired when |
|---|---|
| `tour_booked` | the campus place is actually held (the strongest enrolment predictor) |
| `applied` | the application record exists — not when someone says they intend to apply |
| `docs_complete` | both documents are attached |
| `offer_made` / `enrolled` | the registrar's own decisions, made in the console |

`octwin analytics application --milestones` reports them straight back.

## What the guardian can do

| Journey | What happens |
|---|---|
| 📚 **Programmes** | Carousel with the annual fee and **remaining seats**; a full programme is visibly full. |
| 🏫 **Book a tour** | Campus → a tour slot with its real remaining places (a tour takes a group, so slots have capacity) → ✅, with a day-before reminder. |
| 📝 **Apply** | Programme (only ones with a seat are offered) → student → year → guardian details. |

Send a birth certificate or a report card and the platform reads it — the student's name and
previous school are pre-filled.

## Two deliberate choices

- **Documents are not a hard gate.** An application without a birth certificate is still a lead
  the registrar can chase; one abandoned at a document wall is nothing.
- **A tour without an existing application still creates one** at `tour_booked`, so the tour is
  attributable rather than invisible.

## A gotcha recorded in the flow

`guardian_phone` is forced to text with `'"" + $state.guardian_phone'`. A numeric-looking value —
a tap binding, or a typed `01001234567` — arrives as a **number**, and a `text` field rejects it
on the `invalid` port. That port is wired to hand the reason to the agent with no render, which is
the platform's designed self-correction path: the agent fixes its own argument and retries instead
of showing the guardian a dead end.

```bash
octwin deploy --seed
octwin chat "عايز أعرف مصروفات الابتدائي" --as tester
octwin analytics application --milestones

```
