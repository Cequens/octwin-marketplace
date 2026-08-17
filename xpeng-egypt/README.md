# XPeng Egypt Assistant

A bilingual (عربي / English) conversational assistant for **XPeng Egypt**, running on
**WhatsApp + web** — a pure-YAML pack for the [Octwin](https://www.npmjs.com/package/octwin-cli)
platform. It takes a customer from *“what EVs do you have?”* all the way to a booked test
drive, and picks up again after the sale as an after-sales support desk with SLAs.

> ### 📊 Business overview (interactive)
> **→ [XPeng Egypt Assistant — a showroom on WhatsApp](https://claude.ai/code/artifact/6d41877f-c5ef-4413-ac1e-aa2f74f83dbd)**
>
> A visual, business-focused walkthrough: an **interactive WhatsApp demo** (play the AR/EN
> conversation), the 10 capabilities, the **instrumented purchase funnel**, the after-sales
> ticket lifecycle + SLAs, and an architecture diagram. Best starting point for anyone
> non-technical.

---

## What it does

The customer always starts at a simple menu; from there the assistant calls the right
capability for the moment. The 10 capabilities group into three jobs:

| Job | Capabilities |
|---|---|
| **Discover** | `browse-models` (lineup carousel) · `model-details` (specs + gallery) · `list-branches` (showrooms) |
| **Convert** | `capture-lead` (structured sales lead + 24h follow-up task) · `book-test-drive` (real slot booking + 24h/2h reminders) |
| **Own** | `activate-app` (XPeng app activation) · `open-support` (routed ticket + SLA) · `ticket-status` · `after-sales` |
| **Hub** | `home` (the front door menu) |

## The purchase journey

Every conversation is a measurable funnel (the platform's **journey** module — `journeys/purchase.journey.yaml`):

```
browsing → considering → intent → evaluating → (deal_won)
```

- **In-chat stages** emit automatically as the customer progresses (`browse-models` →
  `model-details` → `capture-lead` → `book-test-drive`), completing the `lead_captured` and
  `test_drive_booked` goals.
- **The terminal `deal_won`** fires **off-channel**: when a rep marks the `lead` record
  `won`, the `lead` pipeline's `on_enter` hook completes the goal, valued per-lead from
  `expected_value` (seeded from the interested model's price at capture time). Real
  cost-per-acquisition / chat-sourced revenue, no double bookkeeping.

Sales gets drop-off per stage, conversion %, time-to-convert, CPA, and pipeline-by-model.

## After-sales

Support is casework (`worklist.yaml`) with a fixed lifecycle
(`open → in_progress → awaiting_customer → resolved → closed`, `+ reopened`) and per-type SLAs:

| Ticket type | Team | Priority | First reply within | Resolve within |
|---|---|---|---|---|
| 🚨 Roadside / breakdown | Technical Service | urgent | 30 min | 2 h |
| 🔌 Charging problem | Technical Service | high | 2 h | 8 h |
| 📱 App owner activation | Customer Care | normal | 4 h | 24 h |
| 🗂️ Other after-sales | Customer Care | normal | 8 h | 48 h |

**Two clocks, not one.** *First reply* is time until a human actually answers the
customer — it stops when an operator relays a message, so it measures whether anybody
picked the ticket up. *Resolve* is time to a finished outcome. Breaching either one routes
the ticket to the **Escalations** queue and sends the customer a different apology, since
"nobody has replied to you yet" and "this is taking longer than we said" are not the same
failure. The alarm is `automation.yaml`, which sweeps every 5 minutes — without it the
targets above are stamped and never read, which is how this pack shipped until v2.9.0.

## Layout

```
manifest.yaml                 # the pack: id, agent, flows, channels (and its version)
prompts/identity.md           # the assistant's system prompt (bilingual behaviour)
flows/tools/*.flow.yaml        # the 10 capabilities (+ .locale.ar/.en.yaml strings)
xrm.yaml                       # records: model · branch · lead · booking (+ demo seed data)
scheduling.yaml                # bookable test-drive slots
worklist.yaml                  # after-sales casework (queues, types, both SLA clocks)
automation.yaml                # the SLA alarm: sweeps both clocks, escalates a breach
journeys/purchase.journey.yaml # the sales funnel (stages · goals · events)
commands.yaml · messages.*     # slash commands + platform messages
```

## Working on it

```bash
octwin validate            # offline structural check (fast)
octwin validate --remote   # the platform's FULL schema check — all errors at once
octwin deploy --seed       # deploy + seed demo catalog (idempotent; reuses AI images)
octwin status              # "✓ live and current" when warm
octwin chat "hi" --as t1   # drive it headlessly (multi-turn by handle; --tap "<id>" to press a button)
```

Data model & platform-feedback notes: see [`FEEDBACK.md`](./FEEDBACK.md).

---

> ℹ️ Model specs and prices in the demo catalog are **indicative placeholders**, not an
> official XPeng Egypt price list. Replace with the official sheet before go-live.
