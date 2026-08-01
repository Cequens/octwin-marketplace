# Pack enrichment — what the platform grew, and which packs should use it

**What this file is.** The platform moved hard between 2026‑07‑20 and 07‑31 — a whole new
integrations module, email as a governed delivery plane, a reaction verb library, validate‑time
contract checking, and an operator console that now renders whatever a pack *declares*. All of it
sits under one `## [Unreleased]` heading upstream, so there was no release note to read. This file
is that note, aimed at the 21 packs in this repo.

**How it differs from its two neighbours.** [`BACKLOG.md`](BACKLOG.md) says *you shipped this
wrong*. [`FEEDBACK.md`](FEEDBACK.md) runs the other way — *the platform should change*. **This file
says: the platform grew, and here is what your pack's business should now use.** Nothing here is a
defect. The handful of things that *are* defects were found while writing it and have been filed in
`BACKLOG.md` under 2026‑07‑31, not here.

**Evidence, not opinion.** Every adoption number below came from a sweep of all 104 flow files and
21 declaration sets in this repo. Where a count is given, it is counted.

**Before you start.** Pull the reference once, at the **repo root** — `octwin platform-kb pull`.
The CLI (≥ 0.3.0) now walks *up* from a pack directory to find `.octwin/platform-kb/`, so one root
pull covers all 21 packs. It also announces a skipped check on the last line it prints, and
`--require-kb` makes a skip fatal. This repo's [`CLAUDE.md`](CLAUDE.md) has been corrected to match.

---

## §0 · Two posture shifts — no action needed

Both landed 2026‑07‑31 and both sound alarming. Neither touches this repo:

- **A pack ships no code.** `routes/`, `*.primitives.*` and every executable extension are rejected
  at deploy. `agents[].hooks:` is deleted and `agentSchema` is now `.strict()`, so a pack still
  declaring it fails loudly.
- **A pack owns no database.** The `data-store` adapter, `db/migrations/*.sql`, the `db_*`
  primitives and the `migrations` / `seeders` / `seed_assets` manifest keys are all gone.
  `.sql` is now rejected outright, with a message naming `xrm.yaml`.

**Verified across all 21 packs: none declares `agents[].hooks:`, `migrations`, `seeders`,
`seed_assets`, `required_adapters: [data-store]`, or calls any `db_*` primitive.** You are already
compliant. Move on.

---

## The spine: two things you already declared and then didn't use

Both sections below exist because the author did the *hard* half and skipped the easy one. They are
first because they are the cheapest wins in the repo.

| | Declared | Actually used |
|---|---|---|
| **Semantic search** | 13 packs declare `search.semantic` — the platform embeds those fields on every write | **22 of 27** `record_search` call sites pass `query: ''`. `record_related`: **0**. |
| **SLAs** | 5 packs declare `sla: { resolve_within_hours }` in `worklist.yaml` | ~~**0** packs declare a `sla_sweep` job~~ — **adopted 2026-08-01 in all five** (see §2) |

---

## §1 · The free text goes nowhere

*A customer types a sentence. The agent drops it into a loosely-typed slot. The flow throws it away
and renders an unfiltered list.* Two halves of one path.

### (a) The slot the agent fills

Every flow already declares `input:` — **104 of 104**, so the surface is understood. The *typing* is
what's thin:

| Of 195 declared input fields | |
|---|---|
| `type: string` | **142** (73%) |
| `type: enum` | 34 |
| `type: number` | 15 |
| using `min:` / `max:` | **2** |

**The exhibit is `gulf-realty`.** In `flows/tools/browse-projects.flow.yaml`:

```yaml
input:
  city:
    type:     string
    optional: true
    describe: 'One of: dubai, abu_dhabi, riyadh, jeddah, sharjah, cairo — only when the buyer named a city.'
```

That is an enum, written to the model as an English sentence, in a pack whose customers type
Arabic. `type: string` means the model may return `"Dubai Marina"`, `"دبي"`, or `"UAE"` — all of
which then miss the `where:` filter silently. The declaration supports the real thing:

```yaml
input:
  city:
    type:     enum
    enum:     [dubai, abu_dhabi, riyadh, jeddah, sharjah, cairo]
    optional: true
    describe: 'Only when the buyer named a city.'
  max_price:
    type:     number
    optional: true
    min:      100000
    describe: 'Upper budget in the local currency, when the buyer stated one.'
```

Now the value is constrained and coerced instead of hoped for, and a bad value fails at the tool
boundary rather than silently matching nothing. **Do this for every city / branch / category /
plan / tier slot in the repo** — they are almost all `type: string` today — and add `min`/`max` to
budgets, quantities and party sizes.

The full field grammar (`type`, `enum`, `optional`, `nullable`, `min`, `max`, `integer`,
`positive`, `default`, `items`, `shape`, `describe`) is in the KB's `dsl` doc under the flow's
top-level `input:` key.

### (b) The read the flow performs

**22 of 27 `record_search` / `product_search` call sites pass `query: ''`.** That is
`record_search` used as `record_list`. Only three packs ever pass live text — `oud-atelier`,
`ecommerce` and `clinic`, via `$input.query` or `$state.brief`.

Meanwhile **13 packs declare `search.semantic`**, which means the platform is computing and storing
an embedding for those fields on *every write*. The index is built, populated, and never queried.
And **`record_related` is called by nobody**, though 10 packs already declare `rank_by`.

So this is one wire, not two features — **type the input, then pass it through.** `record_search`
takes a `query` *and* an optional `where:` facet, so the enum inputs become the facet and the free
text becomes the query:

```yaml
- do: record_search
  args:
    entity:   project
    query:    '$coalesce($input.brief, "")'      # the sentence the customer actually typed
    where:    { all: [{ field: city, op: eq, value: '$input.city' }] }   # the enum slot
    limit:    10
  bind: hits
  outputs:
    ok:    [ { goto: render_hits } ]
    empty: [ { goto: render_none } ]
```

and on the entity, opt the free-text fields into the embedded index:

```yaml
# xrm.yaml → entities.project
search: { text: [name, area, developer], semantic: [name, description], rank_by: rating }
```

`search:` takes `text:` (fuzzy/trigram), `semantic:` (pgvector) or both — at least one is required,
and an entity with no `search:` block errors on `record_search`.

**Who should wire this:** `gulf-realty` (a free-text property brief), `pharmaplus-rx` (symptom →
OTC), `umrah-journeys` (package brief), `shawarma-express` (dish), `homefix-services` (problem
description), `motorcare-service` (symptom → service).

Then the other half you already paid for — "similar to this" on a detail card:

```yaml
- do: record_related
  args: { entity: project, record_id: '$input.project_id', limit: 6 }
  bind: similar
  outputs:
    ok:    [ { goto: render_similar } ]
    empty: [ { goto: done } ]              # no similar items — skip the section, don't error
```

`record_related` requires the entity to declare `search.semantic`. Fits: `gulf-realty`,
`oud-atelier` (fragrance family), `pharmaplus-rx` (alternatives when an item is out of stock),
`umrah-journeys`.

**Two scope notes**, both recent and both easy to get wrong: `record_search` and `record_related`
are **project-wide by default** — pass `contact_id` to narrow — and `active_only` now defaults
**`true`**, which hides everything in a terminal stage. Right for "what's available", wrong for any
history view; say `active_only: false` there deliberately.

---

## §2 · The staff side of the pack — nobody is paged

Every pack in this repo is built for the customer. The business behind it is reached only when an
operator happens to open the console. Five doors exist; four are shut.

### `do: notify` — 0 of 21

The cross-user delivery primitive. Its `to:` is either `{ contact_id }` or
`{ channel, channel_contact_handle }` — so a flow can page a named staff member on their own
WhatsApp with **no `integrations.yaml` at all**. The notify module's own canonical example is
*"notifying a seller about a new lead"*, which is precisely what several packs do not do.

```yaml
- do: notify
  args:
    to:     { channel: whatsapp, channel_contact_handle: '$branch.fields.manager_phone' }
    intent: { render_intent: text_card, body: '🛠️ طلب طوارئ جديد {$req.record_number} — {$req.fields.area}' }
  outputs:
    delivered: [ { goto: confirm_to_customer } ]
    pending:   [ { goto: confirm_to_customer } ]   # queued for an offline staffer — still fine
    failed:    [ { goto: confirm_to_customer } ]   # never block the customer on a staff relay
```

Give every port an explicit body here. `delivered` / `pending` have no canonical handler in the
port-defaults table, so `[]` is not a safe "carry on" — and the lesson is worth encoding anyway: a
failed staff page must not cost the customer their confirmation.

`intent:` is a render intent object, so it obeys that intent's `allowed_keys` — `text_card` allows
only `render_intent` + `body`; use `cta_url` (`header`/`body`/`footer`/`label`/`url`) when the
staffer needs a button.

**The real limit, so you don't build on sand:** the `channel` enum lists
`whatsapp | slack | web | voice | sms`, but only **whatsapp** and **web** have a registered delivery
strategy. A `slack`, `sms` or `voice` handle parses cleanly and then fails to deliver. So:

> **A person → `do: notify`. A Slack channel or a system of record → `push:` + `integrations.yaml`.**

(The misleading enum has been reported upstream in `FEEDBACK.md`.)

**Who should page someone:** `gulf-realty` (new viewing request → the listing's broker),
`homefix-services` (an emergency job → the emirate's crew), `shawarma-express` (order → the branch),
`pharmaplus-rx` (prescription → the on-duty pharmacist), `motorcare-service` (breakdown → the bay).

### `sla_sweep` + `escalate_to` — ~~0 of 21~~ **5 of 21, adopted 2026-08-01**

**This was the sharpest finding in the sweep**, and it is now closed — every pack in the table below
ships an `automation.yaml` with an entity-level `sla_sweep` and an `on.sla_breach` → `open_task:`
hook. Kept here as the worked example, with two corrections marked below. Five packs declare an SLA:

| Pack | Declared |
|---|---|
| `pharmaplus-rx` | prescription review — **2h** |
| `homefix-services` | emergency — **4h** |
| `kaiian` | extra charge / unpaid fare — **4h** |
| `motorcare-service` | breakdown — **4h** |
| `barakah-finance` | finance application — **48h** |

Nothing detected the breach, so `on.sla_breach` never fired and nothing was escalated. A declared
SLA with no sweep is a promise with no alarm — and `pharmaplus-rx` says the hours out loud to the
customer in `otc.locale.ar.yaml` (`placed_sla: '🛵 … خلال {hours} ساعة كحد أقصى.'`).

It is two halves and neither works alone. The job, which mints the breach event:

```yaml
# automation.yaml
jobs:
  - key:              case_sla
    kind:             sla_sweep
    entity:           case          # ← the WORKED entity from worklist.yaml, whatever it is
    interval_seconds: 300
    config:
      message: '🙏 نعتذر عن التأخير — الصيدلي بيراجع روشتتك دلوقتي.'
```

and the hook, which reacts to it:

```yaml
# xrm.yaml → entities.case.on   (`case` needs `extends: system`; hooks survive it)
on:
  sla_breach:
    - open_task:
        title:        '⏰ تجاوز المهلة — {{ record.record_number }}'
        body:         'مراجعة الروشتة تجاوزت ساعتين.'
        due_in_hours: 1
```

**Two corrections to what this section originally said**, both found while adopting it:

1. **The job is entity-level, not SLA-level.** The original example named
   `entity: prescription_request` — an entity no pack declares. The sweep consumes whatever
   `sla_due_at` the *per-type* worklist config stamped at enrolment, so **one job covers every type
   on that entity**: `case` for `kaiian`/`pharmaplus-rx`/`barakah-finance`, `work_order` for
   `homefix-services`, `repair_job` for `motorcare-service`. Read `work:` in `worklist.yaml` to find
   the name — it is not always a pack entity, and for the three casework packs it is the reserved
   `case` system entity, reachable only through `extends: system`.
2. **`escalate_to:` is omitted deliberately.** The original example passed
   `'team:pharmacist_review'` and called it a principal ref — but `pharmacist_review` is a *queue
   key*, and `worklist-guide` §5 describes the sweep as **reassigning** to it, which §4 defines as a
   queue-key move. The two readings target different columns, the schema types it as a bare
   `string`, and a wrong value mis-routes silently. Filed as **C7** in [`FEEDBACK.md`](FEEDBACK.md);
   leave it out until the platform answers.

Pick `interval_seconds` against the **shortest** SLA on the entity, not the longest: 300s for
`pharmaplus-rx`'s 2h prescription review, 900s for the 4h desks, 3600s for `barakah-finance`'s 48h
credit queue. The floor is 60. `kind:` also accepts `segment`, `stale_records` and `task_overdue`.

### `open_task:` reaction verb — 5 of 21 (adopted 2026-08-01, on `sla_breach`)

The operator-side counterpart to `notify:`. Where `notify:` reaches the *customer*, this opens a
due-dated follow-up for a *human*, on the record that fired. Config is `title` (required, templated),
`body` (optional, templated), `due_in_hours` (optional — omitted means no due date, so it can never
be overdue).

Note it fires the `task_opened` hook, so reactions chain. Guard the obvious loop: don't let
`task_opened` open another task.

Only `kaiian` and `xpeng-egypt` call the `do: task_open` primitive at all; nobody uses the verb.

### `kind: task_overdue` — 0 of 21

The task nobody did. Pairs with the above: once you open tasks declaratively, this is what notices
they went stale.

### `push:` to Slack — 1 of 21

`binaa-supply` already does this correctly, and — given the strategy gap above — it is the *only*
way to reach Slack. Generalise its shape rather than replacing it:

```yaml
on:
  create:
    - push:
        operation: slack_post_rfq
        input:
          text: '🧱 New RFQ {{ record.record_number }} — {{ record.fields.material_name }}'
```

`push:` also takes `dedupe` and `when:` — `when:` is a presence test (skipped on empty, `false`,
`0` or `null`), so a mirror on an optional field opts out instead of dead-lettering.

### One naming trap, which is probably why this whole plane got missed

There are **two `notify`s and they have opposite audiences**:

- the **`notify:` reaction verb** messages the **record's contact** — customer-facing, and the only
  one in use (2 packs);
- the **`do: notify` primitive** delivers to **anyone** — staff-facing, and used by nobody.

---

## §3 · Reactions — the seam that makes a pack act when nobody is chatting

*3 of 21 packs* — `binaa-supply`, `nakhla-giving`, `xpeng-egypt`. There is no `reactions.yaml`; the
block lives as `on:` **inside `xrm.yaml`**, under an entity.

A record-lifecycle moment fires a declared consequence **regardless of who caused it** — a flow, a
console operator, an automation sweep, or an inbound webhook. That is the whole point: it is the
only way a pack does anything outside a conversation.

**11 hooks.** In use: `create:` and `enter.<stage>:`. Untouched: `stage_change`, `field_change.*`,
`milestone.*`, `sla_breach`, `assigned`, `routed`, `archived`, `task_opened`, `task_completed`.

**8 verbs.** In use: `push`, `notify`, `track`. Untouched: `send_email`, `survey`, `open_task`,
`schedule`, `transition`.

Templated fields (`message`, `title`, `body`, `subject`, `link`) accept `{{ record.* }}` and
`{{ event.* }}` slots, and **the paths are validated at boot** — a typo fails pack load rather than
rendering literally.

### `stage_change` — one hook instead of one per stage

Carries `event.from` and `event.to`, and fires *alongside* a matching `enter.<stage>`, not instead
of it. Adding a stage no longer silently misses the mirror.

```yaml
on:
  stage_change:
    - notify:
        message: '📦 شحنتك {{ record.record_number }} انتقلت إلى {{ event.to }}.'
```

**Who:** `swiftship-courier` (shipment status — its entire business), `pharmaplus-rx`
(prescription ready), `umrah-journeys` (visa file progress).

### `field_change.<field>` — react to a value, not a stage

```yaml
on:
  field_change:
    payment_status:
      to: paid
      do:
        - notify:
            message:    '🌱 وصلنا تبرّعك — جزاك الله خيراً.'
            link:       '{{ record.fields.checkout_url }}'
            link_label: '📄 الإيصال'
```

`to:` is optional — omit it to mean *any* change. `link` + `link_label` are **both-or-neither**
(enforced at boot) and together render a `cta_url` button rather than a bare URL in the body — which
matters in Arabic, where the bidi algorithm reorders and wraps a pasted link mid-token.
`nakhla-giving` documents exactly this; the rest of the repo should copy it.

**Who:** `gulf-realty` (a listing's price drops → tell everyone who enquired), `shield-motor` (claim
decision), `motorcare-service` (quote approved).

### `survey:` — a survey that invites itself

*0 of 21, against 3 packs that ship `surveys.yaml`.* Today a survey only runs if the customer walks
back into a flow. This verb fires the invite off-channel at the terminal stage:

```yaml
on:
  enter:
    completed:
      - survey:
          survey:         visit_csat            # must exist in surveys.yaml — checked at boot
          message:        '⭐ كيف كانت زيارتك؟ رأيك بيفرق معانا.'
          link:           't:invoke:my-visits:survey=visit_csat'
          link_label:     'قيّم الزيارة'
          cooldown_hours: 72
```

`link` is **required** (unlike `notify`, an empty link is a hard failure — a survey invite with no
way to answer is worse than no invite), and `link_label` defaults to `Start`.

**Who ships no survey and should:** `motorcare-service`, `redsea-resorts`, `homefix-services`,
`ironpulse-fitness`, `swiftship-courier`, `shawarma-express`. Every one of them is a
service business whose whole reputation is the visit.

### `sla_breach` + `open_task:`

Covered in §2 — the hook is inert until a `sla_sweep` job exists to mint the event.

---

## §4 · `send_email` — the second door

*0 of 21, and neither door is used.*

WhatsApp's 24-hour window means a pack **cannot re-engage** a customer who went quiet. Some things
are also just not chat: an offer letter, a policy schedule, an itinerary, an invoice. Email is now a
first-class, governed plane — the platform owns suppression, bounce/complaint ingest, the send
ledger, the daily cap, unsubscribe links and sender selection. **You supply subject + body and never
pick a From.**

The flow door:

```yaml
- do: send_email
  args:
    to:      '$contact.email'
    subject: 'عرض التمويل — {$app.record_number}'
    body:    |
      تم اعتماد طلبك مبدئياً.

      المبلغ: {$app.fields.amount}
    cta: { label: 'اعتماد العرض', url: '$record_url($app.id)' }
  outputs:
    sent:       [ { goto: confirm } ]
    suppressed: [ { goto: confirm } ]   # bounced or unsubscribed — not an error, and not your call
    failed:     [ { goto: confirm } ]
```

The reaction door, for when the trigger is a record moving rather than a turn:

```yaml
on:
  enter:
    approved:
      - send_email:
          subject:        'عرض التمويل — {{ record.record_number }}'
          body:           'تم اعتماد طلبك مبدئياً. التفاصيل بالمرفق.'
          cta_url:        '{{ record.fields.offer_url }}'
          cta_label:      'اعتماد العرض'
          cooldown_hours: 24
```

`cta_url` / `cta_label` are both-or-neither, like `notify`'s `link` pair. The verb's
`cooldown_hours` dedupes against the **send ledger**, not the reminders store.

**Prerequisite:** `contacts.email` is now a first-class column, but you have to collect it. Add an
email step to the flow that already collects a name and phone.

**Who has a document to deliver:** `barakah-finance` (finance offer), `shield-motor` (policy),
`umrah-journeys` (itinerary + visa docs), `nile-academy` (admission letter), `redsea-resorts`
(booking confirmation), `swiftship-courier` (invoice / proof of delivery).

---

## §5 · Public share pages + `cta_url`

*0 of 21 declare an entity `public:` block; 1 of 21 uses the `cta_url` render intent.*

The platform serves an anonymous page + JSON per record at `GET /r/:recordId`. This is how a
WhatsApp conversation becomes something a customer **forwards to their spouse** — which, for a
property, a school or a Hajj package, is where the actual decision happens.

```yaml
# xrm.yaml → entities.project
public:
  where:  { stage: available }        # outside this → 404, so an unlisted property vanishes
  fields: [name, area, developer, price_from, hero_image, description]
  expand: [developer]                 # resolves a record-ref for display
```

Leakage is impossible by construction: `fields` is a strict **allowlist** (contact-typed fields are
rejected at boot and `contact_id` never serializes), and `where` gates visibility. Build the link
from a flow with the `$record_url(record_id)` builtin, and render it as a button:

```yaml
- render:
    render_intent: cta_url
    body:  '🏢 {$p.fields.name} — {$p.fields.area}'
    label: 'شوف التفاصيل'
    url:   '$record_url($p.id)'
```

**Who:** `gulf-realty` (listing), `oud-atelier` (product), `umrah-journeys` (package),
`nile-academy` (programme), `nakhla-giving` (campaign), `redsea-resorts` (room type).

---

## §6 · Integrations — stop being a silo

*2 of 21 — `binaa-supply` and `nakhla-giving`, both good models.*

A pack declares **what** it calls, never **where** or **with what credential**; the operator supplies
`base_url` + secret per project, so the same pack runs against sandbox and production with no
republish.

**`swiftship-courier` is the standout gap: a courier pack whose `track` flow reads XRM only.** It
tracks nothing external. A shipment's real status lives in a carrier API, and the pack should read
it and mirror it in.

Outbound, the pieces worth knowing:

- `operations:` + `do: integration_call` — `path` must be **relative** (this is the enforcement
  point for "a pack cannot name a host").
- `response:` declarative classification — `ok_path`, `error_path`, `items_path`, `data_path`,
  `error_map` — so ports resolve to `ok | empty | invalid | denied | failed` without expression
  gymnastics.
- `idempotent: false` + `probe: { operation, found_path, matches }` — a blind write is not sent
  twice. `matches` handles list-only APIs that cannot be asked a filtered question.
- `cache_ttl_s` (GET, ok-port only) — for vendor **quota**, not latency.

Inbound, for when the external system pushes:

```yaml
inbound:
  carrier_status:
    verify: { scheme: shared_secret_body, secret_path: token }   # for gateways that do not sign
    idempotency: '{{ payload.event_id }}'
    upsert:
      entity: shipment
      match:  record_number                # exactly one field
      fields: { carrier_ref: '{{ payload.tracking }}' }
      stage_map:                           # the sender's vocabulary → your pipeline
        IN_TRANSIT: in_transit
        OUT_FOR_DELIVERY: out_for_delivery
        DELIVERED: delivered
      on_no_match:        ignore
      on_unmapped_stage:  ignore
```

`stage_map` is the piece that makes this practical — you never have to name your stages the way the
carrier does. And an inbound patch **fires reactions**, so §3's `stage_change` hook notifies the
customer with no extra wiring.

Also useful: **`$rows_to_objects(values, headers?)`** addresses a tabular API (Google Sheets and
friends) by column *name* rather than position.

**Who:** `swiftship-courier` (carrier), `pharmaplus-rx` (stock), `motorcare-service` (parts),
`redsea-resorts` (PMS availability), `gulf-realty` (listing feed).

---

## §7 · Automation + `auto_transition` — the records that go quiet

*`automation.yaml`: 2 of 21. `pipeline.auto_transition`: 1 of 21 (`shawarma-express`).*

Abandoned cart, expired hold, stale application. Two mechanisms:

```yaml
# xrm.yaml → entities.cart_line.pipeline
pipeline:
  stages:  [open, submitted, abandoned]
  initial: open
  auto_transition: { from: open, to: abandoned, after_idle_hours: 48 }   # ONE object, not a list
```

`from`/`to` must be declared stages and the move must be legal under `transitions:` — both enforced
at load.

```yaml
# automation.yaml — the sweep that acts on a segment
jobs:
  - key:              nudge_abandoned
    kind:             segment
    entity:           cart_line
    interval_seconds: 3600
    config:
      where:  { all: [{ stage: open }, { not: { updated_within_days: 1 } }] }
      action: { type: notify, message: '🛒 سلتك لسه مستنياك.', cooldown_hours: 48 }
```

`action:` is either `{ type: notify, … }` or `{ type: transition, to: … }`. The `stale_records` job
kind is what executes `auto_transition`.

**Who:** `oud-atelier` has the abandoned-cart shape and **no `automation.yaml`** at all — the
clearest fit. Then `gulf-realty` (stale viewing requests), `barakah-finance` and `nile-academy`
(incomplete applications).

---

## §8 · Declaration slots that now drive the operator console

The records console stopped being a generic grid. It now renders what you declare — an entity
**strip** with your icons, a **stage board** for any entity with a `pipeline:`, an **"About this
entity"** panel, a per-entity **funnel page**, a column picker, and real record/contact pickers for
reference fields.

Which means these slots are no longer cosmetic:

| Slot | What it buys | Repo gaps |
|---|---|---|
| `description:` on an entity/field | the About panel — the console could previously only show *mechanics*, never *intent* | mostly done |
| `icon:` | the entity strip | done |
| `stage_labels:` | localized stage names on the board | **absent in `clinic`, `glamour-salon`, `smile-dental`** |
| `stage_hints:` | one-line per-stage explainers (tooltip, filter help, timeline) | 18 packs have it |
| `field_groups:` + `group:` | ordered, localized sections in the record view | **only `kaiian`** |
| `sortable:` | operator column sorting | absent in `clinic`, `kaiian` |
| `currency:` on a `money` field | correct storage offset — **silently corrupts 3-decimal currencies (KWD/BHD/OMR) without it** | absent in `xpeng-egypt` |
| `localized: true` on a text field | one `{en, ar}` value instead of `name_en`/`name_ar` twins; search folds all locales | **only `xpeng-egypt`** |

`localized:` deserves a note beyond the console. **18 of 21 packs are Arabic-only**, several of them
in Gulf markets with very large expat populations — `gulf-realty`, `homefix-services`,
`ironpulse-fitness`, `smile-dental`, `shield-motor` and `motorcare-service` all sell to people who
may not read Arabic. `localized: true` plus an `en` locale file is the cheapest reach expansion
available, and it is one declaration rather than a parallel field set.

---

## §9 · Modelling shortcuts the hand-rolled packs are missing

`oud-atelier` (`cart_line` / `purchase`) and `shawarma-express` (`basket_line` / `food_order`) both
hand-roll a cart in XRM. That was the right call — commerce seeding is still blocked for external
packs (`FEEDBACK.md` B1, open), so **do not migrate them to the commerce stack**. But two
declarations would delete a lot of their arithmetic:

```yaml
fields:
  lines:
    type:        line_items          # { quantity, unit_price, …snapshot } per row
    rolls_up_to: total               # names the MONEY field the engine maintains — not the reverse
  total:
    type:     money
    currency: SAR                    # Σ(quantity × unit_price), recomputed on every write
constraints:
  unique:
    - fields: [contact_id]           # reserved columns are allowed here now
      where:  { stage: open }        # → "one open cart per contact"
```

`rolls_up_to` removes every manual recompute; the scoped `unique` removes the "did I already have a
cart?" lookup. Neither is used anywhere in the repo.

Two more, also at zero:

- **`enrollment: { key: contact, reentry: …, cooldown_days, idle_reset_days }`** — find-or-create
  with a re-entry policy. `ironpulse-fitness` (membership renewal) and `nile-academy` (a family
  applying for a second child, or reapplying next intake) both need exactly this and both
  approximate it.
- **`rule_attributes:`** in `scheduling.yaml` — declare which typed attributes an availability rule
  carries in `meta`, and the console renders one control and one column per entry. For the
  multi-branch packs: `clinic`, `smile-dental`, `motorcare-service`, `gulf-realty`.

---

## §10 · Where to start, per pack

Three things each, ranked. Everything here is expanded above.

| Pack | 1 | 2 | 3 |
|---|---|---|---|
| `barakah-finance` | `send_email` the offer (§4) | ~~`sla_sweep` for the 48h SLA~~ ✅ | stale-application sweep (§7) |
| `binaa-supply` | wire `$input` → `record_search` (§1) | `stage_change` mirror (§3) | `send_email` the quote (§4) |
| `clinic` | `stage_labels:` (§8) | live `query:` on doctor search (§1) | `rule_attributes:` per branch (§9) |
| `ecommerce` | `record_related` "also viewed" (§1) | `public:` product pages (§5) | `survey:` post-delivery (§3) |
| `glamour-salon` | `stage_labels:` (§8) | `cancel_scheduled` on cancel — **see BACKLOG** | `survey:` verb instead of a flow step (§3) |
| `gulf-realty` | **`city` → `enum` + free-text query (§1)** | `public:` listing pages (§5) | `notify` the broker (§2) |
| `homefix-services` | `notify` the crew (§2) | ~~`sla_sweep` for the 4h emergency~~ ✅ | `survey:` after the job (§3) |
| `ironpulse-fitness` | `enrollment:` for renewals (§9) | `survey:` after a class (§3) | `cancel_scheduled` — **see BACKLOG** |
| `kaiian` | ~~`sla_sweep` for the 4h SLA~~ ✅ | ~~`open_task:` verb~~ ✅ | `sortable:` (§8) |
| `motorcare-service` | ~~`sla_sweep` for breakdowns~~ ✅ | `survey:` after collection (§3) | symptom → `record_search` (§1) |
| `nakhla-giving` | `public:` campaign pages (§5) | `send_email` the receipt (§4) | ship it — still `0.3.0`, `public: false` |
| `nile-academy` | `send_email` the admission letter (§4) | `enrollment:` for re-application (§9) | stale-application sweep (§7) |
| `oud-atelier` | `line_items` + `rolls_up_to` (§9) | `automation.yaml` abandoned cart (§7) | `record_related` fragrance family (§1) |
| `pharmaplus-rx` | ~~**`sla_sweep` for the 2h SLA you promise aloud**~~ ✅ | symptom → `record_search` (§1) | stock `integrations.yaml` (§6) |
| `redsea-resorts` | `schedule_notify` pre-arrival — **see BACKLOG** | `survey:` after the stay (§3) | `send_email` the confirmation (§4) |
| `shawarma-express` | `notify` the branch (§2) | dish → `record_search` (§1) | `line_items` + `rolls_up_to` (§9) |
| `shield-motor` | `approve_apply` on FNOL — **see BACKLOG** | `send_email` the policy (§4) | `field_change` on claim decision (§3) |
| `smile-dental` | `stage_labels:` (§8) | `cancel_scheduled` — **see BACKLOG** | `rule_attributes:` per branch (§9) |
| `swiftship-courier` | **carrier `integrations.yaml` + `inbound` `stage_map` (§6)** | `stage_change` → notify (§3) | `survey:` after delivery (§3) |
| `umrah-journeys` | `scheduling.yaml` for departures — **see BACKLOG** | `public:` package pages (§5) | `send_email` the itinerary (§4) |
| `xpeng-egypt` | `currency:` on money fields (§8) | `approve_apply` before writing — **see BACKLOG** | `sla_sweep` on support cases (§2) |

---

## Reading further

Everything above is in the pulled KB (`octwin platform-kb pull`, then `.octwin/platform-kb/INDEX.md`).
The relevant docs:

| Topic | KB doc |
|---|---|
| Reactions — hooks, verbs, templating | `reactions-guide` |
| Records, `search:`, `public:`, constraints, `line_items` | `xrm-guide` · `craft-data-render` |
| Flow `input:`, expressions, output ports | `dsl` · `craft-flows` |
| Integrations — connections, operations, inbound | `integrations` |
| Email | `email` |
| Cross-user delivery | `notify` |
| Automation jobs, segments | `automation-guide` |
| Surveys · scheduling · worklist · RBAC | `surveys-guide` · `scheduling-guide` · `worklist-guide` · `rbac-guide` |
| Exact primitive / render-intent schemas | `primitives/<name>.json` · `render-intents/<name>.json` |

**Bump the pack version on every change**, and validate before claiming anything works —
`octwin validate --require-kb` offline, `octwin validate --remote` for the `$bind.<path>` checks.