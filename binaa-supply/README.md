# binaa-supply — Binaa Building Supplies

A Riyadh building-materials wholesaler taking RFQs on WhatsApp. **This is the
integrations demo pack**: it is the one that shows a bot working with the systems a
business already runs, rather than only with its own data.

Arabic-first, pure YAML, no pack database.

---

## What it demonstrates

Four seams, one believable loop:

| # | Seam | Where | What happens |
|---|---|---|---|
| 1 | **Flow fetch** | `flows/tools/price-list.flow.yaml` | A customer asks a price → the bot reads the **live** Prices tab and renders a picker. Edit a price in the sheet, ask again, the new price appears — no redeploy. |
| 2 | **Flow push** | `flows/tools/request-quote.flow.yaml` | An RFQ is confirmed → an xrm `quote` is saved (minting `record_number`) → that number is written into a new row in the Quotes tab. |
| 3 | **Observer push** | `xrm.yaml` `on: create` / `on: enter.won` | Slack hears about it, through a **durable queue** rather than on the turn. |
| 4 | **Inbound** | `integrations.yaml` `inbound.quote_status` | Ops sets a row's Status to `shipped` → the sheet's trigger posts a signed webhook → the quote updates → **which re-fires `on: enter.shipped`** → the customer gets a WhatsApp message. |

Seam 4 is the point of the whole pack: **the customer notification is one declared
line of ordinary `notify:`**. Nothing was built for it. The inbound update travels
through the same door every other record change does, so everything that normally
follows a change still follows.

### The rule the pack is built to teach

**Synchronous when the customer is waiting for the answer. Queued when nobody is.**

The price lookup blocks the turn — the reply *is* the price. The Slack alert must
not: a contractor should never wait on Slack's uptime, and the alert has to survive
a 503. That is why the two `slack_post_*` operations are declared
`allow_sync: false` — the platform then *refuses* a synchronous call to them, so a
flow cannot accidentally block on Slack.

There are two of them rather than one taking a `channel` argument, because the
channel is **connection config, not per-call data**: an operation body can read
`{{ conn.* }}`, whereas a `push:` hook's `input:` is rendered from the record alone.
It also reads better — a hook names *which desk* it is telling.

### Why the price list is not an xrm entity

Because finance edits that workbook every day. A mirror here would always be one
sweep out of date, and syncing it is work someone has to remember to do. Reading it
live means the yard keeps using the tool they already use.

### Why Apps Script and not the Sheets API

The Sheets REST API has **no token-only write path** — an API key is read-only and
public-sheets-only, and writing needs OAuth2. An Apps Script Web App is a
first-party Google endpoint the sheet's owner deploys, authenticated by a shared
secret. No OAuth dance, no refresh tokens to rotate.

---

## Setup

You need edit access to a Google Sheet, permission to deploy an Apps Script web app,
and the ability to install a Slack app.

**Prefer to see it work first?** Skip to [Trying it without
credentials](#trying-it-without-credentials) — the whole loop runs against a local
stub, including the WhatsApp message.

### 1 — The workbook

Create a spreadsheet with two tabs. Header names are matched case-insensitively, so
column *order* may change but the names may not.

**`Prices`**

```
sku · name_ar · name_en · category · unit · price · currency · stock · lead_days · available
```

`category` must be one of `cement · steel · blocks · sand · tiles · plumbing`.
`stock` is `in` or `out`. Put `false` in `available` to hide a row.

**`Quotes`**

```
ref · created_at · customer · phone · sku · material · qty · unit · unit_price · total · currency · site · address · status · notes
```

`ref` is filled by the bot and is the join key — leave it alone.

### 2 — Two secrets

```bash
openssl rand -hex 32   # the sheet credential
openssl rand -hex 32   # the inbound signing secret
```

### 3 — Paste and deploy the script

Follow **[`apps-script/binaa-sheet.gs.md`](apps-script/binaa-sheet.gs.md)**. Two
settings decide whether this works at all: **Execute as: Me** and **Who has access:
Anyone**. Copy the `/exec` URL; never use `/dev`.

### 4 — Console → Outbound → Integrations → `sheet`

Paste the `/exec` URL and the sheet credential, and add **`script.googleusercontent.com`**
under **Allowed redirect hosts**. That one is not optional and it is not guessable: a
Web App answers every call with a 302 to a one-time URL on that host, which is a
*different* domain from `script.google.com` rather than a subdomain of it — so the
egress guard refuses the hop until you name it. Without it every call fails with
*host '…googleusercontent.com' is not allowed*, which reads like a broken feature
and is really a missing line in this box.

Save, then press **Test connection**.
A green result means the URL, the credential, the sharing setting, the redirect
follow *and* the script version are all correct — in one click. It returns your
workbook's name, so you can see you reached the right file.

Then **Create inbound secret** and copy both it and the endpoint URL from the
**Inbound** tab.

### 5 — Back to the script

Fill in `OCTWIN_INBOUND_URL` and `OCTWIN_INBOUND_SECRET`, then **Manage deployments →
edit → New version** (not *New deployment*, which changes the URL). Run
`installValidation_` and then `installTrigger_` from the editor and accept the
consent prompt — that consent is what authorizes the callback to leave Google.

### 6 — Slack

api.slack.com/apps → **From scratch** → **OAuth & Permissions** → Bot Token Scopes
**`chat:write`** → **Install to Workspace** → copy the `xoxb-` token. Get channel ids
from *channel → About → bottom*.

Without `chat:write.public` you must `/invite` the bot into both channels, or every
post comes back `not_in_channel`.

### 7 — Console → `slack`

Paste the token and both channel ids, then **Test connection** (it calls
`auth.test`, so a green result names your workspace).

### 8 — Install

```bash
octwin validate            # the same structural gate the server runs
octwin deploy --seed
octwin status
```

---

## Trying it without credentials

The repo ships a stub of the Google side, so you can run all four seams — including
the WhatsApp notification — before asking anyone for access.

```bash
node scripts/dev/fake-apps-script.mjs          # in the platform repo
```

It mimics `/exec`: honours `?secret=`, serves
[`apps-script/fixtures/prices.sample.json`](apps-script/fixtures/prices.sample.json),
**redirects exactly as Google does**, and can post a signed `quote_status` back.

1. Turn on `integrations.allow_insecure_http` and `integrations.allow_private_hosts`
   in Platform → Defaults (the stub is loopback on an arbitrary port).
2. Point the `sheet` connection at `http://127.0.0.1:8788/exec` with secret
   `dev-secret`, and add `localhost` under **Allowed redirect hosts** — the stub
   redirects cross-host on purpose, because the real one does.
3. Set `INTEGRATIONS_SCHEDULER_ENABLED=true` so queued pushes actually drain.
4. `octwin chat "كم سعر الأسمنت المقاوم؟" --as demo1`
5. Confirm an RFQ, then simulate the ops edit:
   `curl "http://127.0.0.1:8788/simulate-edit?ref=1&status=shipped"`

The `slack` connection can point at the stub too — it will accept and log the post.

---

## Verifying it end to end

| Step | What proves it worked |
|---|---|
| `octwin chat "كم سعر الأسمنت المقاوم؟"` | a picker of rows **from your workbook** — edit a price and ask again |
| tap a row, then **اطلب عرض سعر** | collection runs in Arabic; a single site auto-resolves without a tap |
| confirm | the reply carries a reference, and a row appears in `Quotes` with that `ref` |
| `octwin records quote` | `sheet_row` and `sheet_row_url` were written back from the append response |
| watch `#rfq-inbox` | the `on: create` push landed |
| console → move the quote to **won** | `#sales` fires — **from an operator action, with no conversation running** |
| **in the sheet**, set that row's Status → `shipped` | within a couple of seconds the record shows `تم الشحن` with the editor's email, **and the customer's WhatsApp receives the notice** |

Then the negatives, which are what the design is for:

| Try this | Expected |
|---|---|
| change `SHARED_SECRET` without redeploying a new version | the price flow shows the setup card, not a stack trace |
| remove the bot from `#sales`, then win a quote | the delivery **dead-letters visibly** with `not_in_channel` in the Deliveries tab — not a silent success |
| set the same Status twice | deduplicated; **no second WhatsApp** |
| set a Status on a row whose `ref` does not exist | ignored, visible in the Inbound tab, **no phantom record** |
| rotate the Slack token in the console | the next push succeeds with no redeploy — credentials are install-scoped, not pack-scoped |

---

## Troubleshooting

Ordered by how often it actually happens.

- **Everything fails with `non_json_response` / `text/html`** — the web app's *Who
  has access* is not **Anyone**. You are getting a Google sign-in page at HTTP 200.
- **`bad_secret`** — the console credential and `SHARED_SECRET` differ, or you edited
  the script without deploying a **new version** of the existing deployment.
- **Prices work, the RFQ append 405s** — something between you and Google is
  following the redirect with POST. The redirect target is GET-only.
- **Status edits do nothing** — the trigger is a *simple* `onEdit` (it must be
  installable, hence the name `onSheetEdit`), or `installTrigger_` was never run, or
  you edited a column other than `Status`.
- **Every signature is rejected** — the signed-byte mask in `hmacHex_`. Check
  `hmacHex_('k','v')` in the editor against
  `openssl dgst -sha256 -hmac k <<< 'v'`.
- **Slack silent** — open the Deliveries tab. `not_in_channel` and `missing_scope`
  are the usual two, and both are shown with the provider's own error code.
