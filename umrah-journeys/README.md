# Umrah Journeys — Hajj & Umrah packages with a real visa desk

A WhatsApp booking desk for a pilgrimage agency. A pilgrim browses packages, reserves one for
their party, and photographs their passports — and behind the conversation a **visa file opens
as a real ticket** in the operations queue, with an SLA clock, an attachment trail, and a human
officer who decides it. The bot never pretends to grant a visa.

## What the pilgrim can do

| Journey | What happens |
|---|---|
| 🕋 **Browse packages** | Umrah, Ramadan Umrah and Hajj packages as image cards — hotels, distance to the Haram, per-person price. |
| 📋 **Package detail** | Both hotels, transport, everything included, and the price basis. |
| 📝 **Book a package** | Package → travellers → room type → departure city → month → lead name, priced live (room type is a real multiplier), then a preview and an explicit ✅. Reserving opens the visa file automatically. |
| 📎 **Upload documents** | The bot asks for a photo; the platform reads the passport, files it against the live case as evidence, and keeps the traveller's details for the next trip. |
| 💬 **Ask a question** | Anything about ministry rules, eligibility or refunds opens a ticket for a human, with the real SLA quoted. |
| 🧾 **My trip** | Their booking, its stage, and a plain-language explanation of what happens next. |

## What the agency gets

- **A visa queue that behaves like one.** Every reservation opens a `visa_file` case routed to
  `visa_ops` at high priority with a 24-hour SLA. The console shows the inbox, the SLA countdown,
  the attachments, and the decision panel (`visa_approved` with a visa number,
  `docs_incomplete` with what's missing) — and every decision **relays to the pilgrim
  automatically** through the platform notify path.
- **A booking funnel.** `trip` runs `enquiry → reserved → docs_pending → visa_issued → ticketed
  → travelled`, with milestones on reserved / visa issued / travelled.
- **No liability from the bot.** The agent is instructed never to answer a visa rule, predict an
  outcome, or state a stage from memory — those all become tickets or tool calls.

## For the pack author

Pure YAML — no code, no pack database. This is the reference pack for **casework**.

- `worklist.yaml` — four case types, three queues, per-type SLA, and two **custom dispositions**
  (`visa_approved`, `docs_incomplete`) on top of the standard preset.
- `locale.ar.yaml` — the **casework locale contract**, which is boot-enforced in both
  directions: one `cases.<type>` per declared type, all six `status.*` stages, every
  `decision.*`. A missing key *or* an orphan key fails the load, so this file is load-bearing.
- `flows/tools/visa-file.flow.yaml` — the one to read. It carries `type: media` **upload
  fields** (the engine adopts the next inbound photo of the right kind itself, so the fold never
  depends on the agent naming the ref), then `case_attach` + `case_reply`. Three comments in it
  record real gotchas: `case_list` rows key the id as `id` and the type as `type` (not
  `case_id`/`case_type`), and `skip_title` is an **expression**, so it needs `$t("…")` — a bare
  hyphenated key parses as arithmetic and renders `NaN`.
- `flows/tools/book-package.flow.yaml` — `collect:` → live pricing → `approve_apply` → write the
  trip → fire the milestone → open the case. Note the `reserved_no_case` branch: if the case
  can't open, the booking is still real and the pilgrim is told the truth.

Drive it headlessly:

```bash
octwin deploy --seed
octwin chat "أبحث عن عمرة في رمضان" --as tester
octwin chat "جواز محمود" --media ./passport.png --as tester
octwin cases --queues
octwin cases <caseId>
octwin analytics trip --funnel
```
