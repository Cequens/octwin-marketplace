# Shield Motor — quotes the bot may compute, claims it may not decide

A WhatsApp desk for a UAE motor insurer, built around one distinction: a **quote** is arithmetic
over published rating factors, and a **claim** is a human judgement. The pack treats them
completely differently.

## The quote (allowed)

`premium = max(vehicle_value × base_rate%, min_premium)`, then the plan's own young-driver loading
and a capped no-claim discount. Every factor is a field on a published `plan` record, so a pricing
change is a record edit. The result is labelled **indicative** on the card and never called an
offer — the binding premium comes from underwriting once the ownership and licence documents are
seen.

## The claim (not allowed)

`claim` files a first notification of loss, stores the customer's description **in their own
words**, attaches the damage photo to the case, and quotes the real SLA. It states no coverage, no
fault and no amount. Those are assessor dispositions — `assessor_assigned`, `documents_required`,
`settlement_offered`, `claim_declined` — each relaying its own wording.

Routing follows severity, because that is where delay costs most:

| Incident | Queue | SLA |
|---|---|---|
| Injury | Major & Injury Claims | 2h |
| Theft | Major & Injury Claims | 4h |
| Own damage / third party | Claims Assessors | 8h |
| Windscreen | FNOL Desk | 24h |

And the `fnol` pipeline stops at `assessor_review` — there is no settlement stage a flow could
write.

## Safety before the form

The prompt requires the bot to tell a customer reporting injuries, an unsafe vehicle, leaking fuel
or a fire risk to call **police and ambulance first**, in its opening sentence. The claim can be
filed a minute later; the form never comes first.

```bash
octwin deploy --seed
octwin chat "كم قسط التأمين الشامل لسيارة بـ200 ألف؟" --as tester
octwin cases --queues
```
