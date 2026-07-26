# HomeFix Services — a fault becomes a dispatched work order

A WhatsApp dispatch desk for a UAE home-maintenance company. The customer describes the fault
(or photographs it), picks how urgent it is, and the request lands as a **work order in their
region's crew queue** with an SLA clock. A dispatcher assigns a technician in the console and
every decision reaches the customer as a message.

## Urgency is a promise, not a mood

The urgency the customer picks **is** the work type, and the work type is what sets the SLA:

| Choice | Queue promise |
|---|---|
| 🚨 Emergency | 4 hours |
| ⚡ Soon | 12 hours |
| 🗓️ Routine | 48 hours |

The response window quoted back on the confirmation is the queue's own number, not prose in a
prompt. The agent is instructed to reserve `emergency` for flooding, no power, a gas smell or a
security risk — and if a customer insists otherwise, to let them choose it themselves rather
than upgrading it on their behalf.

## What the customer can do

| Journey | What happens |
|---|---|
| 🛠️ **Request a technician** | Service → urgency → emirate → address → contact → time window → fault. Preview shows the **call-out fee** (and the emergency surcharge) before they confirm. |
| 🚨 **Emergency** | The same flow with urgency pre-set — one tap from the menu. |
| 🔧 **Services & fees** | Trade-photo cards with the call-out fee for each service. |
| 📋 **My requests** | Every work order's crew, stage and what happens next. |

Send a photo or a voice note and the platform reads it — the trade and the description are
pre-filled instead of re-asked.

## What the company gets

- **Regional dispatch, not a central inbox.** `work_order` routes by `emirate` through an
  explicit `map`, so a Sharjah leak reaches the Sharjah crew. An unmapped emirate lands on
  `dispatch_desk` rather than minting a phantom queue.
- **Dispositions that talk to the customer** — `technician_assigned` (with name and ETA),
  `quote_sent`, `parts_needed` (with an ETA), `job_done` — each relayed automatically.
- **A property record** with a `geo` pin, so a returning customer's home (and its history) is
  one record, and the technician gets coordinates rather than "next to the bakery".
- **A funnel** on `work_order` (`received → dispatched → on_site → awaiting_parts →
  completed`) with milestones on dispatched and completed.

## For the pack author

Pure YAML — no code, no pack database. Two hard-won notes are recorded in the flow comments:

- **Never name a step after a node op-key.** This flow's commit step was originally called
  `dispatch` — which is also the `dispatch:` node op-key. It passed validation, but
  `approve_apply`'s `apply: dispatch` silently fell through to `on_other`, so the ✅ tap
  re-rendered the preview for ever and no record was written. Renaming it to `raise_order`
  fixed it.
- **An *offered* optional media field (one with a Skip button) directly before an
  `approve_apply` breaks the confirm.** The Skip tap leaves a `$control` payload that the next
  resume classifies as "neither approve nor decline". The photo is taken as an agent-supplied
  `MEDIA-` ref instead — the platform's `inbound_preprocessing` has already read it, so nothing
  is lost and a missing photo can never block a callout.

```bash
octwin deploy --seed
octwin chat "في تسريب ماء تحت المغسلة" --as tester
octwin analytics work_order --funnel
```
