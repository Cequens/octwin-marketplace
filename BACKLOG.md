# Marketplace pack backlog

Defects and follow-ups found in the **shipped packs** by platform-side analysis, for the pack
developer to action. Newest batch first. Each entry names the file, the line, what the customer
experiences, and the fix.

This file is the counterpart to [`FEEDBACK.md`](FEEDBACK.md): feedback reports what the *platform*
should change, this backlog tracks what the *packs* should change. When the platform gains a check
that a pack fails, the finding lands here rather than being fixed silently upstream — a pack author
should see it once, in one place, with the evidence.

**How these were found.** Every entry below comes from running a machine check over all 104 flow
files in the 21 packs: the render-intent field contract (`allowed_keys`, published in the platform
KB) and the primitive input schemas (`platform-primitives.json`). Nothing here is a style opinion.

---

## 2026-07-30 — clinic's manifest header documents a retired mechanism — ✅ CLOSED

> **Closed 2026-07-30 — and it was not only clinic.** The corrected header was applied verbatim,
> then the same check was run across all 21 packs: **6 packs, 9 files** carry this defect class.
> 21/21 validate clean offline; the 5 edited packs pass `octwin validate --remote`.
>
> **Retired symbols stated as current** (what `check:stale-terms` fails on):
>
> | Pack | Line | Claim |
> |---|---|---|
> | `clinic/manifest.yaml` | 2, 5, 6, 8 | the four in this entry |
> | **`kaiian/manifest.yaml`** | **8** | **`publishInRepoPacks`, `register.ts` — missed by this entry** |
>
> **Platform source paths / TS symbols cited as authority** — not retired, but unopenable by a
> marketplace author, which is the same failure the corrected header fixes:
>
> | Pack | File:line | Symbol |
> |---|---|---|
> | `clinic` | `messages.ar.yaml:3,6,8` | `definePack`, `src/platform/core/manifest/messages.ts`, `resolveMessages` |
> | `xpeng-egypt` | `messages.ar.yaml:3,6,8` | `definePack`, `src/platform/manifest/messages.ts`, `resolveMessages` |
> | `clinic`·`kaiian`·`ecommerce` | `manifest.yaml:18/18/20` | `manifestYamlSchema` |
> | `ecommerce` | `manifest.yaml:50` · `messages.en.yaml:5` | `catalog.seed.ts`, `npm run seed:gen`, `resolveMessages` |
> | `kaiian` | `flows/tools/reply-to-case.flow.yaml:15` | `index.ts §mergeTurnInput` |
> | `pharmaplus-rx` | `flows/tools/otc.flow.yaml:57` | `OPS_BY_TYPE`, `xrm/filters.ts` |
>
> Every one now points at the **pulled KB** instead — `declarations/manifest.json`,
> `declarations/messages.json`, the xrm guide, the runtime doc — which is what an author actually has.
>
> **Worth noting:** `clinic` and `xpeng-egypt` cited *different paths for the same file*
> (`src/platform/core/manifest/messages.ts` vs `src/platform/manifest/messages.ts`), so at least one
> was already wrong even as an internal reference — the reason a source path makes a bad citation.
>
> **Deliberately kept:** the phrase *"no per-pack glue, no register.ts"* survives in `clinic` and
> `kaiian`. It names the retired symbol only to say it does **not** exist, and the corrected header
> in this entry keeps that line verbatim. If `check:stale-terms` flags a negative assertion, that is
> the gate to adjust, not the copy.
>
> Clean across all 21 packs: no `pack.json` references, no retired per-flow `taps:` blocks.



Found by copying `clinic/` verbatim into the platform repo as a test fixture
(`test-fixtures/packs/clinic/`) and discovering it could not live under `src/**`: the platform's
`check:stale-terms` gate fails any file that states a retired symbol as current, and this header does
it twice.

**Audit — wrong docs, no customer impact.** Nothing is broken at runtime; every YAML declaration in
the pack is correct and it loads clean. This is authoring guidance that will mislead the next person
who copies clinic as a starting point — which its own first line invites them to do.

### `clinic/manifest.yaml:1-11` — the header describes the retired `src/packs` boot scanner

```yaml
# clinic — the minimal reference pack. COPY THIS to start a new pack
# (`npx tsx scripts/pack-scaffold <your-id>` does the copy + rename for you).
#
# A pack is declared entirely by this one file. The platform auto-discovers
# any `src/packs/<id>/manifest.yaml` at boot (`publishInRepoPacks`) and
# wires the agent + flows in — no per-pack glue, no register.ts.
```

Three claims, all retired **2026-07-27**:

- **`src/packs/<id>/manifest.yaml`** — that directory is gone. Packs live in this repo and reach a
  tenant through `octwin deploy` or the operator repo import.
- **`publishInRepoPacks`** — deleted with it. There is no boot-time publish; the runtime resolves every
  pack from an immutable content-addressed artifact via `packDir`.
- **`scripts/pack-scaffold`** — a platform-repo script path, not something a marketplace author has.

**Corrected header:**

```yaml
# clinic — the minimal reference pack. Copy this directory to start a new pack.
#
# A pack is declared entirely by this one file plus its sibling declarations
# (xrm.yaml / scheduling.yaml / surveys.yaml / commands.yaml). Deploy with
# `octwin deploy`; the runtime resolves the pack from the published artifact.
# No per-pack glue, no register.ts.
#
# Schema authority: the `manifest` declaration schema in the platform KB
# (.octwin/platform-kb/declarations/manifest.json) — `.strict()`, so unknown
# keys are rejected. Required: id, version (string), description.
```

The last line of the current header also points at `src/platform/core/manifest/schema.ts` as "schema
authority", which is a platform source path an author cannot open. The pulled KB is the authority they
actually have.

---

## 2026-07-29c — declaration gaps the new console surfaces make visible — ✅ CLOSED

> **Closed 2026-07-29.** `sortable: true` added to **61 fields across 18 packs**; `stage_labels:`
> declared on **all 22 pipelined entities across 17 packs**. Verified with octwin-cli 0.1.20 against
> KB `5bd9d41b9cae`: 21/21 packs clean offline, 21/21 pass `octwin validate --remote` — which is the
> check that matters here, since a `stage_labels` key that is not a declared stage is a boot error.
>
> **Method.** `ar` was read programmatically from each pack's own `locale.ar.yaml` `stage.*` keys
> rather than retyped, so the declaration and the flow-side `$enum_label(stage, "stage")` are
> byte-identical (including emoji and the ZWJ in `shawarma-express`'s `👨‍🍳`) — the "keep them
> saying the same thing" rule in the xrm guide. English was authored for all 22; Arabic was authored
> only for the 8 entities whose packs had no `stage.*` coverage. `stage_labels:` sits at entity
> level immediately after `pipeline:`, never inside it.
>
> **Three corrections to this batch's examples.** All three named in the `sortable:` fix are wrong,
> though the audit behind them is right:
> - `swiftship-courier` `shipment.created_at` — `created_at` is a **built-in column, not a declared
>   field**, so it cannot carry `sortable:`, and it is not in `shipment`'s `list:` either. Skipped.
> - `oud-atelier` `product.price` — there is no `product` entity; it is **`fragrance`**.
> - `shawarma-express` `order.total` — there is no `order` entity; it is **`food_order`**.
>
> Scope taken: the `number`/`money`/`date` columns each entity already names in `list:`, per the
> fix's own wording. `text`/`select` columns were left alone — indexing every one of them buys
> little and costs writes.

The operator console now renders each entity's declared `list:` fields as the records table's
columns, sorts on a column server-side, and names pipeline stages from a new `stage_labels:` key.
Two declarations that were previously inert are now load-bearing for what an operator sees.

**How these were found.** A `js-yaml` parse of all 20 `xrm.yaml` files (73 declared entities, 22 of
them pipelined). Counts below are exact, not sampled.

### [audit] No pack declares `sortable:` on any field — 0 of 73 entities

Operators can now sort the records table by a declared `number`/`money`/`date`/`text`/`select`
column. Sorting works without `sortable: true` — it simply **scans** the `(project, entity)` subset
instead of hitting an index, because `sortable:` is what emits the functional btree.

**What the customer experiences:** nothing today, and a slow Records page on the entities that grow.
The cost is invisible until a table has tens of thousands of rows, which is exactly when it is
hardest to diagnose.

**Fix:** add `sortable: true` to the fields operators actually sort by — the money/number/date
columns already named in each entity's `list:`. Examples: `oud-atelier` `product.price`,
`swiftship-courier` `shipment.created_at`, `shawarma-express` `order.total`.

### [audit] No pack declares `stage_labels:` — 0 of 22 pipelined entities

Stages had no `label` slot in the grammar until 2026-07-29, so every stage rendered as Title Case of
its key everywhere: the console badge, the stage filter, the pipeline control, the timeline and the
funnel.

**What the customer experiences:** an operator reading `Docs Check` and `No Show` instead of the
words the business uses — and, in Arabic-first packs, English chrome over Arabic data.

**Fix** — entity level, beside `field_groups` (NOT inside `pipeline:`, which an `extends: system`
pack may not declare):

```yaml
entities:
  captain_application:
    pipeline:
      stages: [submitted, docs_check, active, rejected]
    stage_labels:
      submitted:  { en: Submitted,    ar: "تم التقديم" }
      docs_check: { en: "Docs review", ar: "مراجعة المستندات" }
      active:     { en: Active,       ar: "نشط" }
      rejected:   { en: Rejected,     ar: "مرفوض" }
```

Keys must be declared stages and an entity with no pipeline may not declare them — both are boot
errors, so a typo fails the deploy rather than silently doing nothing. The seven platform system
entities (`order`, `booking`, `case`, `cart`, `campaign`, …) already ship en/ar labels, so an
`extends: system` pack inherits them and only needs `stage_labels:` for stages it renamed or added.

### Not a pack defect — noted for context

Nine packs extend the system `booking` without declaring `list:`, and so inherit the platform
template's `list: [slot_start]`: one column, no customer or resource. That thinness is the
**platform template's** to fix, not the packs'. Logged in the platform repo's `docs/BACKLOG.md`.

**Correcting an earlier estimate:** a draft of this batch claimed most entities declare no `list:`.
The parse says the opposite — **64 of 73 do**, and all 9 that don't are the `booking` case above.
There is no widespread `list:` gap in the marketplace.

---

## 2026-07-29d — OPEN — found while closing 2026-07-29c

### P1 — `nakhla-giving` renders an unresolvable stage label to donors

[`flows/tools/my-donations.flow.yaml:92`](nakhla-giving/flows/tools/my-donations.flow.yaml) and
`:106` call:

```yaml
$enum_label($item.stage, "stage")     # ✗ no fallback argument, and no "stage" strings exist
```

**The pack has no `locale.ar.yaml` / `locale.en.yaml` at all** — it is the only pack in the
marketplace without one — and `grep` finds no `stage.*` key anywhere in it. Every other pack either
defines `stage.*` at pack level (`swiftship-courier`, `kaiian`, …) or resolves stages through a
flow-local `$enum_lookup(… , $item.stage)` **with the raw stage as the fallback**
(`oud-atelier`, `gulf-realty`). This one does neither, and unlike its siblings it passes **no third
argument**, so there is not even a raw-key fallback.

A donor opening "my donations" sees the status line resolve to nothing (or to the bare key
`paid` / `refunded`) on every gift.

**Not fixed here** — the fix is new customer-facing Arabic copy, which is the pack owner's call, not
a mechanical correction. The Arabic now sitting in `nakhla-giving/xrm.yaml` `stage_labels:` (authored
in 2026-07-29c: `بانتظار السداد` / `تم السداد` / `فشل السداد` / `تم الاسترجاع`) is the obvious source
to copy into a new `locale.ar.yaml`, which would also satisfy the "keep them saying the same thing"
rule. Note the declaration and the locale are still **two separate stores** — the console reads
`stage_labels:`, the flow reads the locale — so declaring one does not populate the other.

---

## ✅ Status — all batches CLOSED (2026-07-29)

Every finding below is fixed. Verified with octwin-cli **0.1.20** against a freshly pulled KB
(`content_hash 6f0088c969f5`):

- `octwin validate` (offline) — **21/21 packs clean**, 0 render-intent and 0 primitive-argument errors.
- `octwin validate --remote` — **21/21 packs pass the platform's FULL validation**, which is what
  clears the `$bind.<path>` class in batch 2026-07-29b (it has no offline equivalent).

| # | Finding | Resolution |
|---|---|---|
| 1 | `booking_cancel` wrong arg (3 packs) | `booking_record_id:` → `record_id:` |
| 2 | `nakhla-giving` dead-end fallback | `text_card` → `detail_card` (the intent that carries `buttons`) |
| 3 | `binaa-supply` fabricated `group_by:` | rebuilt on `sections:` + a `{for_each, as, template}` fragment |
| 4 | `binaa-supply` quote sort ignored | `sort:`/`order:` → `sort_by: { field, dir }` |
| 5 | `record_get args: { all: true }` (3 sites) | key removed; comments corrected |
| 6 | implicit `active_only` audit | 3 real defects fixed; the rest confirmed correct |
| 7 | `$bind.record_id` on a `record_get` payload | → `$bind.id` (5 sites) |

**One correction to the report itself.** Finding #5 says `all` "does not widen the search beyond the
current contact" and implies the intent is unimplemented. It is not needed: unlike `record_list`,
**`record_get` is not contact-scoped at all** — an `entity` + `match:` lookup already reaches any
record. So `swiftship-courier`'s waybill lookup ("a recipient can track a parcel a shop sent them")
was working the whole time, and dropping `all` changes no behaviour. Only the misleading comments
needed fixing.

**Note on #6.** The audit found 3 genuine defects, not 56 — most history flows already set
`active_only: false` correctly. The real ones, all hiding exactly the rows the customer asked for:

| Pack | File | Entity | What was hidden |
|---|---|---|---|
| `binaa-supply` | `flows/tools/my-quotes.flow.yaml` | `quote` (terminal: delivered, lost) | delivered orders vanished from quote history |
| `gulf-realty` | `flows/tools/my-requests.flow.yaml` | `booking` (terminal: completed, cancelled, no_show) | viewings already attended |
| `gulf-realty` | `flows/tools/my-requests.flow.yaml` | `buyer_lead` (terminal: reserved, lost) | **`reserved` is the SUCCESS case** — the buyer's own reservation |

`motorcare-service`'s `vehicle` list was checked and left alone: the entity declares no pipeline, so
`active_only` is a no-op there.

---

## Batch — 2026-07-29 (platform-KB review) — ✅ CLOSED

**None of these produce an error today.** Every one is a value the runtime accepts and then drops,
which is why they survived `octwin validate --remote` and reached production. The platform now
rejects the render-intent class at load and `octwin validate` (octwin-cli **≥ 0.1.19**) flags it
offline — **re-pull the reference first: `octwin platform-kb pull`**, then re-validate every pack.

### P1 — broken for the customer

#### 1. "Cancel my booking" does nothing in three packs

| Pack | File |
|---|---|
| `smile-dental` | [`flows/tools/my-visits.flow.yaml:90`](smile-dental/flows/tools/my-visits.flow.yaml) |
| `glamour-salon` | [`flows/tools/my-visits.flow.yaml:72`](glamour-salon/flows/tools/my-visits.flow.yaml) |
| `ironpulse-fitness` | [`flows/tools/my-schedule.flow.yaml:57`](ironpulse-fitness/flows/tools/my-schedule.flow.yaml) |

All three call:

```yaml
- do: booking_cancel
  args: { booking_record_id: '$input.visit_id' }   # ✗ no such argument
```

`booking_cancel` takes **`record_id`** and reads nothing else — its handler destructures
`{ record_id }`, so it receives `undefined` and cancels nothing. The unknown key is dropped in
silence. A patient/client taps "cancel my appointment" and the booking stays live, the seat stays
held, and the reminders still fire.

```yaml
- do: booking_cancel
  args: { record_id: '$input.visit_id' }           # ✓
```

#### 2. `nakhla-giving` — the stale-appeal fallback has no way out

[`flows/tools/donate.flow.yaml:168`](nakhla-giving/flows/tools/donate.flow.yaml) renders a
`text_card` carrying `buttons`. **`text_card` takes `body` and nothing else** — no header, no
footer, no buttons. The "browse live appeals" button has never rendered, so a donor whose campaign
reference went stale reaches a dead end with no tappable way forward.

Change `render_intent: text_card` → **`detail_card`**, which is the intent that carries `buttons`.

#### 3. `binaa-supply` — price-list grouping never happened

[`flows/tools/price-list.flow.yaml:111`](binaa-supply/flows/tools/price-list.flow.yaml) passes
`group_by:` to a `list_picker`. **There is no `group_by` field on any render intent.** A
`list_picker` groups through `sections:`.

This one is worth reading closely, because the pack *documents* the non-existent field: the
comment at line 97 explains how `group_by:` behaves ("reads a FIELD, not an expression"), and an
`assign` step above it builds a `group` field solely to feed it. A capability was invented,
described, and built against — the exact failure the platform KB exists to prevent. The rule to
take from it: **if a field is not in `render-intents/<intent>.json`, it does not exist** — intents
do not share a field vocabulary.

### P2 — silently wrong

#### 4. `binaa-supply` — quote list sorts ascending regardless of `order: desc`

[`flows/tools/my-quotes.flow.yaml:21`](binaa-supply/flows/tools/my-quotes.flow.yaml):

```yaml
args: { entity: quote, limit: 10, sort: record_number, order: desc }   # ✗ `order` dropped
```

`record_list` has no `order` argument; direction travels inside **`sort_by`**:

```yaml
args: { entity: quote, limit: 10, sort_by: { field: record_number, dir: desc } }   # ✓
```

The customer sees their **oldest** quotes first — the opposite of intent, and the failure mode
looks like "the data is wrong" rather than "the argument was ignored".

#### 5. `record_get args: { all: true }` — dropped in three packs

`swiftship-courier` [`claim.flow.yaml`](swiftship-courier/flows/tools/claim.flow.yaml) ·
[`track.flow.yaml:36`](swiftship-courier/flows/tools/track.flow.yaml) · `pharmaplus-rx`
[`otc.flow.yaml`](pharmaplus-rx/flows/tools/otc.flow.yaml).

`record_get` takes `record_id`, `entity`, `match`, `expand` — no `all`. The lookups still work
(each supplies a valid `match:`), so this is cosmetic **today**, but it means the author believed
`all: true` widened the search beyond the current contact. It does not. If any of these lookups is
meant to reach records the contact does not own, that behaviour is not currently implemented and
needs a real mechanism. Delete the key or replace it with the intended one.

### P3 — audit, not yet a defect

#### 6. 56 `record_list` calls leave `active_only` implicit

`active_only` defaults to **true**, which drops every record sitting in a `terminal` pipeline
stage. That default is right for "what's open" and wrong for history. Audit the flows whose whole
purpose is showing past activity — receipts, completed orders, closed tickets, past visits —
because there the default hides exactly the rows the customer asked for. This bit
`nakhla-giving` before: a donation receipt list hid every donation the moment it was PAID.

Set it explicitly wherever the answer is "show me what already happened":

```yaml
args: { entity: order, active_only: false }
```

The other ~50 call sites are probably correct as-is; the point is to make the choice deliberate
rather than inherited.

---

## Batch — 2026-07-29b (the `$bind.<path>` check) — ✅ CLOSED

A second machine check now walks every `$<bind>.<field>` read against the schema of the port that
bound it. It found **five** reads that resolve to `undefined` at runtime, all the same mistake, all
in cart/basket flows. `octwin validate --remote` reports these (there is no offline equivalent —
the check needs the resolved port schemas).

### P1 — broken for the customer

#### 7. `record_get`'s payload has no `record_id` — it is `id`

| Pack | File | Line |
|---|---|---|
| `oud-atelier` | [`flows/tools/cart.flow.yaml`](oud-atelier/flows/tools/cart.flow.yaml) | 67, 95 |
| `shawarma-express` | [`flows/tools/basket.flow.yaml`](shawarma-express/flows/tools/basket.flow.yaml) | 59, 83 |
| `pharmaplus-rx` | [`flows/tools/otc.flow.yaml`](pharmaplus-rx/flows/tools/otc.flow.yaml) | 141 |

The `ok` port publishes `id`, `entity`, `record_number`, `title`, `stage`, `contact_id`, `fields`,
`created_at`, `updated_at`, `refs?` — there is **no `record_id`**. (The name exists as an *input* to
`record_get`, which is where the confusion comes from.) So `$prod.record_id` is `undefined`:

```yaml
- do: record_get
  bind: prod
  …
      fields:
        fragrance:  '$prod.record_id'    # ✗ undefined  → the line's ref field is empty
        fragrance:  '$prod.id'           # ✓
```

**The worst instance is the remove-from-cart path**, `oud-atelier:95` and `shawarma-express:83`:

```yaml
zero_line:
  - do: record_save
    args:
      entity:    cart_line
      record_id: '$gone.record_id'       # ✗ undefined
      fields:    { qty: 0, line_total: 0 }
```

With `record_id` undefined and no `match:`, `record_save` takes the **create** path — so "remove
this from my cart" adds a *new* zero-quantity line and **leaves the real line in the cart**. The
shopper removes an item, sees it still there, removes it again, and accumulates junk rows.

Fix: `$gone.id` / `$prod.id` / `$item.id` / `$dish.id`. Check the payload of any port you read in
`primitives/<name>.json` → `portSchemas`.

> Note for the other 42 ports: two thirds of platform output ports still publish no payload shape,
> and the check is silent for those — a clean run is not proof, but a finding is real.

---

## Recurring rules (the shape of every defect above)

1. **An unknown key is dropped, not rejected** (outside render intents, which now fail at load).
   `booking_record_id`, `group_by`, `order`, `all` all read as working code and did nothing.
   Check the argument list in `primitives/<name>.json` before inventing a name that seems obvious.
2. **A field that isn't on the port reads as `undefined`, and `undefined` is not inert.** Passed to
   another primitive it changes which branch runs — an absent `record_id` turns an update into an
   insert. Check `portSchemas`, not the argument list, when reading a bind.
3. **Render intents do not share a field vocabulary.** `buttons` belongs to `detail_card`, not
   `text_card`; a carousel *card* has no `title`. Read `render-intents/<intent>.json`.
4. **`octwin validate` only sees what the platform published.** Re-pull after a platform upgrade
   (`octwin platform-kb pull`) or you are validating against last month's contract.
5. **The KB has to sit in the PACK directory, not the repo root** — and this is why this whole batch
   reached production. `octwin validate` looks for `<packDir>/.octwin/platform-kb/`, and when it
   does not find one it **silently skips** the render-intent and primitive-argument checks and still
   prints a green `✓`. This repo had a single root-level pull, so every per-pack validate had been
   passing with both checks switched off. Pull into each pack (`.octwin/` is gitignored), and treat
   a `✓` with no `✓ render intents …` / `✓ primitive arguments …` line above it as "not checked"
   rather than "clean".