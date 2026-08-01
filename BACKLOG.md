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

## 2026-07-31 (b) — five promises the packs make and do not keep

Found while surveying the repo for [`ENRICHMENT.md`](ENRICHMENT.md) — the capability-adoption memo.
These are the findings from that sweep that are **defects, not enrichment**: in every case the pack
already declares or says the thing, and the behaviour behind it is missing. Enrichment
opportunities stay in that file; these belong here.

**How they were found:** a cross-reference of each pack's declarations (`scheduling.yaml`,
`worklist.yaml`, `automation.yaml`) against the primitives its flows actually call.

### Broken for the customer

**1 · A cancelled appointment still fires its reminders — `glamour-salon`, `ironpulse-fitness`, `smile-dental`.**

All three call `booking_cancel` and all three arm reminders with `schedule_notify`, but none calls
`cancel_scheduled`. The pending reminders are never revoked, so a customer who cancels still
receives «تذكير بموعدك غداً» at T‑24h and T‑2h for a visit that is not happening.

| Pack | Cancels at | Arms at | Revokes |
|---|---|---|---|
| `glamour-salon` | `flows/tools/my-visits.flow.yaml:71` | `flows/tools/book-appointment.flow.yaml:164` | — |
| `ironpulse-fitness` | `flows/tools/my-schedule.flow.yaml:56` | `flows/tools/book-class.flow.yaml:180` | — |
| `smile-dental` | `flows/tools/my-visits.flow.yaml:89` | `flows/tools/book-visit.flow.yaml:175,189` | — |

`clinic` already does this correctly (`flows/tools/manage-appointments.flow.yaml:153,156,375,378`) —
copy its shape. All three packs declare `reminders: [{ key: t24 }, { key: t2 }]` in
`scheduling.yaml`, so the fix is two calls in the step that follows a successful cancel, using the
same `dedupe_key` the booking flow wrote:

```yaml
  cancel_done:
    - do: cancel_scheduled
      args: { dedupe_key: 'smile-dental:visit:{$state.visit_id}:t24' }
      detach: true
    - do: cancel_scheduled
      args: { dedupe_key: 'smile-dental:visit:{$state.visit_id}:t2' }
      detach: true
```

**2 · `redsea-resorts` declares a pre-arrival reminder and never arms it.**

`scheduling.yaml` declares `reminders: [{ key: t48, seconds: 172800 }]`, and **no flow in the pack
calls `schedule_notify`** — it is the only scheduling pack with zero. The guest books a Red Sea stay
and hears nothing until they arrive. The declaration reads as a working feature to anyone reviewing
the pack. Arm it in `book-stay.flow.yaml` after the reservation returns, following
`smile-dental/flows/tools/book-visit.flow.yaml:170-186`.

### Silently wrong

**3 · `shield-motor` files a claim with no confirmation step.**

`flows/tools/claim.flow.yaml` runs gather → save FNOL → open case with **no `approve_apply`
anywhere in the pack** — the only pack of 21 with none. A first notification of loss is committed
from whatever the agent parsed, with no ✅ preview. `xpeng-egypt` has the same shape more mildly: it
writes first and renders a confirmation card afterwards, so the customer confirms something already
done.

**4 · Three packs take a document as a photo.**

`pharmaplus-rx` (prescription), `shield-motor` (policy schedule) and `umrah-journeys` (passport)
all accept `image:` media handlers only — **no pack in the repo declares a `document:` handler**. A
customer sending a PDF prescription gets no handler at all.

### Audit

**5 · Two booking businesses have no diary.**

`umrah-journeys` has `book-package.flow.yaml` and `homefix-services` has `request-visit.flow.yaml`,
and **neither ships a `scheduling.yaml`**. Departures and technician visits are plain XRM records:
nothing holds capacity, nothing reminds. This may be deliberate (a Hajj departure is a fixed date,
not a slot grid) — flagged for a decision rather than asserted as a bug. If it is deliberate, a
comment in the flow saying so would stop this being re-found every sweep.

---

## Closed — the ledger

Full evidence for each lives in git history; only the outcome is kept here. Each was verified with
`octwin validate` **and** `octwin validate --remote` across all 21 packs before closing.

| Batch | What it was | Outcome |
|---|---|---|
| 2026-08-01 (b) | five packs declared an SLA that nothing swept — no `sla_sweep` job existed in the repo, so `on.sla_breach` could never fire | An `automation.yaml` with one entity-level `sla_sweep` in each: `kaiian` + `barakah-finance` + `pharmaplus-rx` on `case`, `homefix-services` on `work_order`, `motorcare-service` on `repair_job` — one job covers every type, since the sweep consumes the `sla_due_at` the per-type config stamped. Each paired with an `on.sla_breach` → `open_task:` hook (the three `case` packs reach it through `extends: system`). Tick chosen against the shortest SLA: 300s for the 2h prescription review, 900s for the 4h desks, 3600s for the 48h credit queue. `escalate_to:` deliberately omitted — see FEEDBACK. All five bumped minor. |
| 2026-08-01 | `kaiian` shipped two plaintext agent passwords, which `validatePackBundle` now rejects | Both `password:` fields dropped from `demo-identity.yaml` (`kaiian` 1.1.0 → 1.2.0), plus the header comment that documented the field as a feature and the "log in as them" demo claim it supported. Signing in as a seeded agent is now an invite from Workspace → Team. `demo-identity.yaml` exists in exactly one pack, so no other pack was affected. |
| 2026-07-31 | 18 `record_aggregate` calls read the whole project | 14 got `contact_id`, 4 got `all: true`. Included a confirmed live leak (`glamour-salon` greeting a new contact with a stranger's booking) and two cart badges summing every shopper's basket. |
| 2026-07-30 | 50 money fields with no `currency:`; the human layer unused | `currency:` on all 50, 28 sibling text fields deleted (+89 demo values, 3 writes, 29 reads). `icon:`/`description:` on all 73 entities, `stage_hints:` on all 22 pipelines, `description:` on 52 non-obvious fields. |
| 2026-07-30 | `clinic`'s manifest documented a retired mechanism | Found in **6 packs, 9 files**, not just clinic. All now cite the pulled KB instead of platform source paths. |
| 2026-07-29d | `nakhla-giving` rendered a blank donation status | It was the only pack with no pack-level locale at all. Added `locale.ar.yaml` + the fallback argument every sibling pack already passed. |
| 2026-07-29c | no pack declared `sortable:` or `stage_labels:` | `sortable: true` on 61 fields, `stage_labels:` on all 22 pipelined entities. |
| 2026-07-29 / 29b | render-intent fields and primitive arguments the runtime dropped | `booking_cancel` cancelling nothing in 3 packs, a fabricated `list_picker group_by`, `text_card` carrying `buttons`, `$bind.record_id` on a `record_get` payload turning updates into inserts. |

---

## Recurring rules (the shape of every defect above)

1. **An unknown primitive argument is dropped, not rejected.** `booking_record_id`, `group_by`,
   `order`, `all` all read as working code and did nothing. Check `primitives/<name>.json` →
   `inputSchema` before inventing a name that seems obvious.
2. **A field that isn't on the port reads as `undefined`, and `undefined` is not inert.** Passed to
   another primitive it changes which branch runs — an absent `record_id` turns an update into an
   insert. Check `portSchemas`, not the argument list, when reading a bind.
3. **Render intents do not share a field vocabulary.** `buttons` belongs to `detail_card`, not
   `text_card`; a carousel *card* has no `title`. Read `render-intents/<intent>.json`.
4. **`octwin validate` only sees what the platform published.** Re-pull after a platform upgrade
   (`octwin platform-kb pull` at the repo root) or you are validating against last month's contract.
5. **Pull the KB once, at the repo root — and delete any per-pack copies.** CLI ≥ 0.3.0 walks **up**
   from the pack directory, so one root pull covers all 21. The **nearest** copy wins, so a leftover
   `<pack>/.octwin/` from the old per-pack era shadows the root pull and silently validates against
   the old contract. `rm -rf */.octwin` once, then pull at the root.
   *(Before 0.3.0 the lookup was pack-directory-exact and failed open — a missing KB skipped the
   render-intent and argument checks while still printing a green `✓`. That is how the 2026-07-29
   batch reached production. A skip is now announced on the last line; `--require-kb` makes it
   fatal.)*
6. **A green `octwin validate --remote` is not "it will load".** Boot-time contracts — the flow
   lint, the casework locale coverage — have historically had no CLI path. If a pack passes
   validation and fails on import, that gap is the finding, not your YAML.
