# binaa-supply — Binaa Building Supplies

A Riyadh building-materials wholesaler taking RFQs on WhatsApp. **This is the
integrations demo pack**: it is the one that shows a bot working with the systems a
business already runs, rather than only with its own data.

Arabic-first, pure YAML, no pack database.

---

## What it demonstrates

Four seams, one believable loop — all through Google's own API, with **no Apps
Script to deploy**:

| # | Seam | Where | What happens |
|---|---|---|---|
| 1 | **Flow fetch** | `flows/tools/price-list.flow.yaml` | A customer asks a price → the bot reads the **live** Prices tab and renders a picker. Edit a price in the sheet, ask again, the new price appears — no redeploy. |
| 2 | **Flow push** | `flows/tools/request-quote.flow.yaml` | An RFQ is confirmed → an xrm `quote` is saved (minting `record_number`) → that number is appended as a new row in the Quotes tab. |
| 3 | **Observer push** | `xrm.yaml` `on: create` / `on: enter.won` | Slack hears about it, through a **durable queue** rather than on the turn. |
| 4 | **Mirror** | `xrm.yaml` `on: stage_change` | Ops moves the quote in the console → the customer gets a WhatsApp message **and** the move is appended to the sheet's `Status log`. |

Seam 4 is the point of the whole pack: **the customer notification is one declared
line of ordinary `notify:`**. Nothing was built for it. Any stage change travels
through the same door — a console click, a flow, an automation sweep — so
everything that normally follows a change still follows.

### The rule the pack is built to teach

**Synchronous when the customer is waiting for the answer. Queued when nobody is.**

The price lookup blocks the turn — the reply *is* the price. The Slack alert and the
sheet mirror must not: a contractor should never wait on Slack's uptime or on a
spreadsheet write, and both have to survive a 503. That is why `slack_post_*` and
`sheets_append_status` are declared `allow_sync: false` — the platform then
*refuses* a synchronous call to them, so a flow cannot accidentally block on them.

There are two `slack_post_*` rather than one taking a `channel` argument, because
the channel is **connection config, not per-call data**: an operation body can read
`{{ conn.* }}`, whereas a `push:` hook's `input:` is rendered from the record alone.
It also reads better — a hook names *which desk* it is telling.

### Why the price list is not an xrm entity

Because finance edits that workbook every day. A mirror here would always be one
sweep out of date, and syncing it is work someone has to remember to do. Reading it
live means the yard keeps using the tool they already use.

### Where status lives

**In the console, not the sheet.** This is the one workflow rule the pack asks for,
and everything else follows from it.

Google offers no webhook for a cell edit, so an earlier version of this pack
deployed an Apps Script whose `onEdit` trigger posted back to us. That script was
also the source of nearly every setup failure — a deployment URL that 404s with a
trailing slash, a "Who has access" setting that returns a sign-in page as HTTP 200,
an extra redirect host to allow-list, a shared secret to rotate. And it does not
generalise: the next system that will not call you needs its own bespoke script.

So the direction is reversed. Ops changes the stage where the record actually lives,
and the platform appends the change to a **`Status log`** tab. One writer per fact:

| Fact | Direction | How |
|---|---|---|
| prices | sheet → platform | `sheets_prices`, read live, cached 60 s |
| RFQs | platform → sheet | `sheets_append_quote` |
| status | platform → sheet | `sheets_append_status`, via `on: stage_change` |

Every move is written back **twice**, on purpose:

- **`Status log`** — appended, one row per change. No row index to invalidate, so
  it survives anything anyone does to the workbook, and it gives the yard an audit
  trail rather than a single overwritten cell.
- **`Quotes!N`** — the quote's own Status cell, overwritten, so the sales desk sees
  the current state where they already look, without being taught a formula.

The cell write is the fragile half: it addresses a **row number**, taken from the
append's own `updatedRange` when the row was created. **Sort the Quotes tab with a
Filter View, never by sorting the data** — a real sort renumbers every row, and the
write would then land on a different quote. If the two ever disagree, the log is the
one that is right.

### Why the reads are cached

Google allows **300 reads per minute for the whole Cloud project** — shared across
every workspace on the platform, not per tenant. Uncached, the number of price
questions would be the ceiling for everybody. `cache_ttl_s: 60` on `sheets_prices`
makes cost scale with the number of tenants instead, and a minute of staleness on a
list finance edits a few times a day is invisible.

---

## Setup

You need edit access to a Google Sheet, a Google Cloud project with the Sheets API
enabled, and the ability to install a Slack app. **No Apps Script**, no shared
secret, no deployment to keep current.

### 1 — The workbook

Create a spreadsheet with three tabs.

**`Prices`** — the one humans edit. Header names are matched case-insensitively, so
column *order* may change but the names may not.

```
sku · name_ar · name_en · category · unit · price · currency · stock · lead_days · available
```

`category` must be one of `cement · steel · blocks · sand · tiles · plumbing`.
`stock` is `in` or `out`. Put `FALSE` in `available` to hide a row.

**`Quotes`** — written by the bot. Unlike Prices, this one is addressed by
**position**, because the platform is its only writer: do not reorder or delete
columns, and sort with a *Filter View* rather than sorting the data.

```
ref · created_at · customer · phone · sku · material · qty · unit · unit_price · total · currency · site · address · status · notes
```

`status` is written by the platform; `ref` is the join key.

**`Status log`** — written by the bot, append-only.

```
ref · from · to · at · by
```

### 2 — Register the Google OAuth client (operator, once for the platform)

Google Cloud console → **APIs & Services**:

1. **Library → enable the Google Sheets API.** Skipping this is the one failure that
   survives a successful connection: the token mints fine and the *first call*
   returns `SERVICE_DISABLED`.
2. **Credentials → OAuth client ID → Web application.** Paste the redirect URI shown
   in *Platform → Integrations → OAuth apps* — it must match character-exactly.
3. If the consent screen is in **Testing**, add yourself under *Test users*, or
   consent is blocked.
4. Register the client id and secret in **Platform → Integrations → OAuth apps**.

### 3 — Console → Outbound → Integrations → `sheets`

Press **Connect** and approve at Google. There is no credential box: the access
token is renewed by the platform and anything pasted would be overwritten.

Then fill in **Spreadsheet ID** — the segment of the sheet URL between `/d/` and
`/edit` — and **Save**.

Press **Test connection**. It returns your workbook's title, which proves the grant,
the scope and the spreadsheet id in one click.

### 4 — Slack

api.slack.com/apps → **From scratch** → **OAuth & Permissions** → Bot Token Scopes
**`chat:write`** → **Install to Workspace** → copy the `xoxb-` token. Get channel ids
from *channel → About → bottom*.

### 5 — Console → `slack`

Endpoint `https://slack.com/api`, the `xoxb-` token, and the two channel ids. **Test
connection** runs `auth.test` and names the workspace it reached.

### 6 — Install

```bash
octwin validate            # the same structural gate the server runs
octwin deploy --seed
octwin status
```

Set `INTEGRATIONS_SCHEDULER_ENABLED=true` on the platform so queued pushes drain.

---

## Verifying it end to end

| Step | What proves it worked |
|---|---|
| `octwin chat "كم سعر الأسمنت المقاوم؟"` | a picker of rows **from your workbook** — edit a price and ask again |
| ask again within a minute | the same answer with **no Google call** — the 60 s cache |
| tap a row, then **اطلب عرض سعر** | collection runs in Arabic; a single site auto-resolves without a tap |
| confirm | the reply carries a reference, and a row appears in `Quotes` with that `ref` |
| `octwin records quote` | `sheet_range` was written back from the append response |
| watch `#rfq-inbox` | the `on: create` push landed |
| console → move the quote to **won** | `#sales` fires — **from an operator action, with no conversation running** |
| console → move it to **shipped** | the customer's WhatsApp arrives **and** a `Status log` row appears with `won → shipped` and your email |

Then the negatives, which are what the design is for:

| Try this | Expected |
|---|---|
| sort the Quotes tab, then move another quote | the `Status log` row is still correct — an append has no row index to invalidate |
| revoke access at [myaccount.google.com](https://myaccount.google.com/permissions) | the card reads **access revoked**; calls stop rather than retrying, because a revoked grant cannot self-heal |
| remove the bot from `#sales`, then win a quote | the delivery **dead-letters visibly** with `not_in_channel` in the Deliveries tab — not a silent success |
| break the sheet's sharing, then move a stage | the status push dead-letters, and the stage move and the customer message both still happen |
| rotate the Slack token in the console | the next push succeeds with no redeploy — credentials are install-scoped, not pack-scoped |

---

## Troubleshooting

Ordered by how often it actually happens.

- **`SERVICE_DISABLED` on the first call** — the Sheets API is not enabled in the
  Cloud project. Consent succeeded; the API is simply off.
- **`redirect_uri_mismatch`** — the URI registered with Google differs from the one
  in *Platform → Integrations → OAuth apps*, character for character.
- **"Access blocked: app not verified"** — the consent screen is in *Testing* and
  you are not on the test-user list.
- **Connected, then dead a few days later** — the grant came back without a refresh
  token. The card shows **expires — reconnect**; press Reconnect. (The platform asks
  Google for `access_type=offline` + `prompt=consent`, which is what normally
  prevents this.)
- **`403` naming a scope** — fewer permissions were granted than requested. The card
  flags a partial grant; reconnect and accept all of them.
- **Prices look stale for up to a minute** — that is `cache_ttl_s: 60` on
  `sheets_prices`, and it is why the platform's read quota is not the ceiling. Lower
  it if a yard genuinely needs faster.
- **Slack silent** — open the Deliveries tab. `not_in_channel` and `missing_scope`
  are the usual two, and both are shown with the provider's own error code.
