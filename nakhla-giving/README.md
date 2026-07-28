# nakhla-giving — Nakhla Giving

A licensed Saudi charity taking donations on WhatsApp. **This is the payments
demo pack**: the one where the integration is money, and where getting it wrong
costs someone a charge rather than a blank cell.

Arabic-first, pure YAML, no pack database.

---

## Status: validated, and driven against a real Moyasar test account

`octwin validate --remote` is green — the same check `deploy` runs, so the
manifest, `xrm.yaml`, `integrations.yaml` and every flow are accepted by the
platform itself. Beyond that, the outbound calls, the webhook round trip and a
successful `paid` payment have all been exercised against live `sk_test_`
endpoints (see below). What has NOT run is the pack's own `paid` branch end to
end — see *Still unproven*.

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

### What HAS been verified against the live test API (2026-07-28)

Both of this section's original open questions were settled by driving real
`sk_test_` endpoints, and **the first one was answered the wrong way** — the
original design was broken:

1. **Invoice `metadata` does NOT reach the payment webhook.** Moyasar accepts
   metadata on `POST /v1/invoices`, stores it, and returns it on invoice reads — and
   does not copy it onto the payment. A payment created against an invoice comes
   back `metadata: null` with a populated `invoice_id`. The original join on
   `payload.data.metadata.ref` would have matched **nothing, for every donation, for
   ever**, and because `on_no_match: ignore` is the safe setting it would have failed
   by doing nothing at all: no error, no receipt, every gift stuck at `pending`. The
   join is now `payload.data.invoice_id` against the stored `invoice_id`.
2. **`moyasar_find_invoice` works for the probe.** The list envelope is
   `{ invoices: [...], meta }`, and each row DOES carry `metadata` — so the probe's
   `matches:` on our ref finds a landed invoice. Confirmed with a real ref.
3. **Arabic survives.** `description` and `metadata` round-trip UTF-8 intact, so an
   Arabic appeal title reaches the donor's checkout page unmangled.
4. **The credential is one key, not two.** See the connection's `describe:` — a
   `pk_…:sk_…` pair in the user:password field gets a 403 "User not authorized".

5. **The webhook round trip works.** A real Moyasar POST arrived, passed
   `shared_secret_body` verification, joined on `invoice_id`, had `payment_failed`
   translated to `failed` by `stage_map`, and fired the `enter: failed` reaction —
   `{"hook":"enter.failed","verbs":[{"ok":true,"verb":"notify"}],"triggered_by":"integration:moyasar"}`
   on the donation's timeline. The payment failed only because the card was declined
   (`DECLINED: INVALID CARD OR NOT FOUND`), which is the gateway working.

6. **A test card really does reach `paid`.** `4111111111111111` with the 3DS ACS
   emulator set to `AUTHENTICATED` returns `status: paid`, `APPROVED` — see *Paying a
   test invoice* below for why every other candidate card fails misleadingly.

**Still unproven:** the pack's own `paid` branch, end to end. Every mechanism it
depends on has now run for real — the same signature verification, the same
`invoice_id` join, the same `stage_map`, the same reaction seam, all exercised on the
`failed` branch — and a `paid` payment has been produced at the gateway. What has not
been observed is those two halves meeting: a `payment_paid` webhook landing on a
donation record, so the receipt copy and the `first_gift` milestone are still unseen.
Duplicate suppression (a replayed body) also remains only as good as its unit test.

### One known gap

Tapping a row in `my-donations` re-renders the list instead of re-offering that
donation's `checkout_url`, which is the single most common reason a donor comes back.
The row's `on_select` passes a `ref` the flow does not declare as an input, so the tap
is a no-op.

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

## Paying a test invoice (the part the docs do not spell out)

Verified empirically against the live sandbox on 2026-07-29, because the obvious
attempts all fail with a message that blames the wrong thing.

**1 — Use a card the sandbox recognises; `4111111111111111` always works.** Pushed
through the API, `4111111111111111` authorises and the other common test numbers
(`5555555555554444`, `4464040000000007`, `5297412542005689`, `4000000000000002`) all
return `DECLINED: INVALID CARD OR NOT FOUND` — a message that reads like a bug in your
integration and is not one. A real mada test card issued to the account also works via
the hosted checkout page, so this is a list of what was *verified*, not an exhaustive
claim about what the gateway accepts. Expiry: any future date. CVC: any 3 digits.

**2 — On the 3-D Secure page, pick `AUTHENTICATED`.** The sandbox does not send an
OTP. It shows an *ACS Emulator* screen with a dropdown where you choose the outcome,
and the choice maps straight through:

| ACS dropdown | payment status | gateway message |
|---|---|---|
| `AUTHENTICATED` | **`paid`** | `APPROVED` |
| `UNAUTHENTICATED` | `failed` | `3DS: Card authentication declined.` |
| `AUTHENTICATION_REJECTED` | `failed` | `3DS: The authentication attempt was rejected by the issuer bank.` |

Abandoning that page leaves the payment at `initiated` for ever — which is exactly
what an unfinished checkout looks like in production, and why `pending` is a normal
resting state for a donation rather than an error.

## Verifying it end to end

| Step | What proves it worked |
|---|---|
| `octwin chat "أبي أتبرع"` | the campaign picker, from your own records |
| tap a campaign, choose an amount, confirm | a checkout link arrives **on the turn**, and a `donation` record exists at `pending` |
| pay with `4111111111111111`, choosing `AUTHENTICATED` on the 3DS page | the record moves to `paid` and the donor receives a receipt on WhatsApp |
| `octwin records donation` | `gateway_payment_id` and `paid_at` were written by the webhook, not by a flow |

Then the negatives, which are what the design is for:

| Try this | Expected |
|---|---|
| replay the same webhook body | recorded as `duplicate`, **no second receipt** |
| post a webhook with a wrong `secret_token` | rejected, visible in the Inbound tab |
| post a webhook whose `ref` does not exist | ignored — **no phantom donation** |
| swap in a publishable `pk_` key | `donate` shows the setup card, not a stack trace |
| let the invoice call time out after it succeeded | the retry probe finds the ref and does **not** create a second invoice |
