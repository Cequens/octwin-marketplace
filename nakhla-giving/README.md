# nakhla-giving — Nakhla Giving

A licensed Saudi charity taking donations on WhatsApp. **This is the payments
demo pack**: the one where the integration is money, and where getting it wrong
costs someone a charge rather than a blank cell.

Arabic-first, pure YAML, no pack database.

---

## ⚠️ Status: passes the platform's full validation, NOT yet run against a live gateway

`octwin validate --remote` is green — the same check `deploy` runs, so the
manifest, `xrm.yaml`, `integrations.yaml` and every flow are accepted by the
platform itself. **Nothing here has touched a real Moyasar account.**

Green validation is worth less than it looks, and this pack is the evidence. The
first version validated clean while carrying five bugs the validator cannot see,
because a primitive's `args:` are open (`additionalProperties: {}`) and a `bind:`
path is never compared to the port schema — so `record_list args: { mine: true }`,
`record_get args: { record_number: … }`, `where: { stage: active }` and
`$found.records` (the envelope is `rows`) were all accepted and all silently did
nothing. Worst of the five: `record_aggregate` is project-wide **by default**,
the opposite of `record_list`, so the home card told every donor they had the
entire charity's unpaid donation count. All five are fixed; the gap is logged in
the platform's [`docs/BACKLOG.md`](https://github.com/Cequens/octwin/blob/master/docs/BACKLOG.md).

The same lesson has landed repeatedly here: a duplicated `Content-Type` header,
an auth kind that sent no credential at all, and a probe that silently found
nothing were each invisible to a green suite and only surfaced when a real vendor
pushed back. Assume the same of the payment path below.

Two specific things to check first with a `sk_test_` key:

1. **Does the invoice's `metadata` reach the payment webhook?** The inbound
   declaration joins on `payload.data.metadata.ref`. Moyasar documents metadata as
   echoed in webhook messages, but this pack creates an **invoice** and the webhook
   carries a **payment**. If the payment does not inherit the invoice's metadata,
   switch the join to `payload.data.invoice_id` and store `invoice_id` as the match
   field — the record already keeps it.
2. **Does `moyasar_find_invoice` actually list recent invoices** in a way the retry
   probe can search? If the list is paginated smaller than expected, widen `limit`
   or key the probe on something narrower.

Until both are confirmed, treat a `paid` record as unproven.

---

## What it demonstrates

| # | Seam | Where | What happens |
|---|---|---|---|
| 1 | **Own data** | `campaigns` | Live appeals from the charity's own records. Deliberately NOT an integration — the catalogue is theirs, only the payment is someone else's. |
| 2 | **Pay** | `donate` | A donation record is minted, then a Moyasar invoice, and the donor gets a checkout link **on the turn**. |
| 3 | **Inbound** | `payment_status` | Moyasar posts when the payment clears → the record moves to `paid` → which fires the **existing** notify verb → the donor gets a receipt. |

Seam 3 is why this pack exists. `binaa-supply` shows a spreadsheet being made to
look like it emits events; this shows a system that **genuinely pushes**, which is
where the inbound seam belongs.

### The order of the two writes is the whole design

`donate` saves the xrm record **before** it creates the invoice, which is the
opposite of what feels natural. The reason:

- `record_save` mints `record_number`, which is the join key handed to the gateway
  as invoice metadata and echoed back on the webhook. Without a record first, a
  payment could clear for a donation with no row.
- If the invoice call fails, you are left with a `pending` donation and no link —
  recoverable and visible. The reverse failure, a live invoice with no record, is a
  donor charged for something the charity cannot see.

### Money rules the platform enforces for you

- **The invoice create is `idempotent: false` with a `probe:`.** `POST /v1/invoices`
  mints a new invoice every call, so a retry after a timeout would produce a second
  link and potentially a second charge. The platform now **refuses at pack load** to
  let a `push:` reach a non-idempotent operation without a probe.
- **Amount conversion happens once.** SAR is quoted in halalas, so `donate` multiplies
  by `config.giving.minor_units` in exactly one step. Sending `100` when you meant
  100 SAR charges one riyal and nothing in the response looks wrong.
- **The gateway's vocabulary is translated, not adopted.** `stage_map` turns
  `payment_paid` into `paid`. Naming a pipeline stage after someone else's event type
  would be letting a contract you do not control into your own domain model.

### Verification is weaker here, and the pack says so

Moyasar does **not sign** its webhooks — it echoes a shared `secret_token` inside the
JSON body. The pack uses `verify.scheme: shared_secret_body`, which the platform
supports precisely because the vendor gives no alternative.

It is weaker than an HMAC: nothing binds the secret to the body, so an intercepted
request can be replayed with a **modified** body. Replay protection therefore comes
entirely from the declared `idempotency: '{{ payload.id }}'` — which is why the
platform refuses this scheme without one. Prefer an HMAC with any gateway that offers
it.

---

## Setup

You need a Moyasar account and the ability to register a webhook.

### 1 — Records

In the console, create a few `appeal` records and move them to **active**. The bot
only reads these; the charity's team owns them.

### 2 — Console → Outbound → Integrations → `moyasar`

- **Credential:** your **secret** key with a trailing colon — `sk_test_xxxxx:`.
  Moyasar authenticates with HTTP Basic using the key as the username and an
  **empty** password, and the platform base64-encodes the stored `user:pass` pair
  as-is. A publishable key (`pk_…`) will fail: it can create payments but cannot
  read them.
- **Webhook URL:** copy the `payment_status` endpoint from the **Inbound** tab and
  paste it into the `callback_url` setting.
- **Create inbound secret**, and use the *same* value as the webhook's secret token
  in the Moyasar dashboard.

Press **Diagnose** rather than **Test connection** — it reports every setup problem
at once instead of the first one.

### 3 — Moyasar dashboard → Webhooks

Register the endpoint for `payment_paid`, `payment_failed` and `payment_refunded`,
with the shared secret from step 2.

---

## Verifying it end to end

| Step | What proves it worked |
|---|---|
| `octwin chat "أبي أتبرع"` | the campaign picker, from your own records |
| tap a campaign, choose an amount, confirm | a checkout link arrives **on the turn**, and a `donation` record exists at `pending` |
| pay with a Moyasar **test card** | the record moves to `paid` and the donor receives a receipt on WhatsApp |
| `octwin records donation` | `gateway_payment_id` and `paid_at` were written by the webhook, not by a flow |

Then the negatives, which are what the design is for:

| Try this | Expected |
|---|---|
| replay the same webhook body | recorded as `duplicate`, **no second receipt** |
| post a webhook with a wrong `secret_token` | rejected, visible in the Inbound tab |
| post a webhook whose `ref` does not exist | ignored — **no phantom donation** |
| swap in a publishable `pk_` key | `donate` shows the setup card, not a stack trace |
| let the invoice call time out after it succeeded | the retry probe finds the ref and does **not** create a second invoice |
