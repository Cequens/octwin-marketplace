# PharmaPlus Rx — a pharmacy bot that refuses to practise pharmacy

A WhatsApp counter for an Egyptian pharmacy chain. Patients photograph a prescription and it
reaches a **pharmacist** with a 2-hour SLA; they shop the over-the-counter shelf; and every
clinical question is routed to a human rather than answered.

This is the pack where the **boundary is the product**.

## Three layers of guard, not one prompt

1. **The vision prompt transcribes and refuses to interpret.** It returns the prescription lines
   verbatim, sets `legible: false` when the image is unclear, and is explicitly told not to
   validate, correct, substitute or comment on any medicine, dose or interaction.
2. **The data carries the rule.** `otc_item.rx_required` is a hard flag: the shelf query filters
   `rx_required != true`, so a prescription-only line is **never returned** by the OTC flow. A
   second explicit gate in `rx_gate` catches a code that arrives any other way and routes it to
   the pharmacist. (Verified: the seeded antibiotic never appears in the carousel, and a direct
   add is refused.)
3. **The dispensing decision is a disposition.** `approved_for_dispensing`,
   `needs_clarification`, `item_unavailable`, `refer_to_prescriber` — all pharmacist-only, each
   relayed to the patient automatically.

The prescription text is stored **verbatim** on the record, because a pharmacist dispenses against
the paper, not against our paraphrase — and the photo is attached to the case so they can open it
directly.

## What the patient can do

| Journey | What happens |
|---|---|
| 📄 **Send a prescription** | Photo → patient name → delivery area → address → phone. Opens a pharmacist review with the real 2-hour window. Nothing about the medicine is said. |
| 🧾 **Review status** | Only what the pharmacist recorded. `pharmacist_review` explicitly means *being read*, not *approved*. |
| 🛒 **Shelf items** | Painkillers, vitamins, baby care, devices — with a basket and delivery fee. |

## The emergency path

The prompt requires the bot to tell a patient describing chest pain, breathing difficulty, a
suspected overdose, poisoning, a seizure, heavy bleeding or an unresponsive child to call emergency
services **now** — not to take an order, not to open a ticket instead.

```bash
octwin deploy --seed
octwin chat "عايز أصرف روشتة" --media ./rx.jpg --as tester
octwin cases --queues
```
