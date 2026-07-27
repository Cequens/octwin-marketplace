# The Binaa sheet bridge — Apps Script

Paste this into **Extensions → Apps Script** on the Binaa workbook. It is the only
code in this pack, it runs on Google's side, and the platform never reads this file.

> **Why a `.md` and not a `.gs`?** A pack bundle may only contain
> `yaml · yml · md · sql · json` plus images — the deploy server rejects anything
> executable. Shipping the script fenced inside Markdown keeps it travelling *with*
> the pack (so an operator installing from the marketplace finds the runbook and the
> script in the same place) while remaining a file nothing on the platform executes.

**Version 1.0.0.** The `ping` action reports this back, so the console's *Test
connection* button tells you whether the copy you pasted is current.

## Edit these three constants

| Constant | Where it comes from |
|---|---|
| `SHARED_SECRET` | You invent it. Paste the same string into the console as the `sheet` credential. |
| `OCTWIN_INBOUND_URL` | Console → Integrations → Inbound tab → the endpoint for `quote_status`. |
| `OCTWIN_INBOUND_SECRET` | Console → Integrations → Connections → `sheet` → **Create inbound secret**. Shown once. |

You will need two passes: paste and deploy first, then come back for the two
`OCTWIN_*` values once the console has given you the endpoint.

## The script

```javascript
/**
 * Binaa Building Supplies — Octwin bridge.  VERSION 1.0.0
 *
 * Do not rename the functions: `doGet` / `doPost` are the web-app entry points and
 * `onSheetEdit` is the trigger handler.
 */
var VERSION = '1.0.0';

// ── EDIT THESE THREE ────────────────────────────────────────────────────────
var SHARED_SECRET         = 'PASTE_THE_SHEET_CREDENTIAL_YOU_ENTERED_IN_THE_CONSOLE';
var OCTWIN_INBOUND_URL    = 'https://YOUR-OCTWIN/api/integrations/TENANT/PROJECT/quote_status';
var OCTWIN_INBOUND_SECRET = 'PASTE_THE_INBOUND_SECRET_FROM_THE_CONSOLE';
// ────────────────────────────────────────────────────────────────────────────

var PRICES_SHEET = 'Prices';
var QUOTES_SHEET = 'Quotes';
var STATUSES     = ['new', 'quoted', 'won', 'shipped', 'delivered', 'lost'];

/* ── HTTP ───────────────────────────────────────────────────────────────────
   Content Service cannot set a status code or a response header: EVERY reply is
   HTTP 200, and an uncaught throw returns an HTML error page — also 200. So every
   entry point is wrapped and the caller discriminates on the JSON body, never on
   the status. Both handlers also redirect to a one-time googleusercontent.com URL
   that is GET-only; the caller must follow it with GET.                        */

function doGet(e) {
  try {
    if (!authorized_(e, {})) return json_({ ok: false, error: 'bad_secret' });
    var action = String((e && e.parameter && e.parameter.action) || 'prices');
    if (action === 'ping') {
      return json_({
        ok: true, version: VERSION,
        sheet: SpreadsheetApp.getActiveSpreadsheet().getName()
      });
    }
    if (action === 'prices') return json_(prices_(e.parameter || {}));
    return json_({ ok: false, error: 'unknown_action', action: action });
  } catch (err) {
    return json_({ ok: false, error: 'script_error', detail: String((err && err.message) || err) });
  }
}

function doPost(e) {
  try {
    var body = parseBody_(e);
    if (!authorized_(e, body)) return json_({ ok: false, error: 'bad_secret' });
    var action = String(body.action || (e.parameter && e.parameter.action) || '');
    if (action === 'append_quote') return json_(appendQuote_(body));
    return json_({ ok: false, error: 'unknown_action', action: action });
  } catch (err) {
    return json_({ ok: false, error: 'script_error', detail: String((err && err.message) || err) });
  }
}

/** Apps Script never parses a JSON body for you — `e.postData.contents` is the raw
 *  string. A form-encoded body IS split into `e.parameter`, so accept both. */
function parseBody_(e) {
  if (!e || !e.postData || !e.postData.contents) return {};
  var type = String(e.postData.type || '');
  if (type.indexOf('application/json') === 0 || type.indexOf('text/plain') === 0) {
    try { return JSON.parse(e.postData.contents); } catch (err) { return {}; }
  }
  return e.parameter || {};
}

/** The deployment URL is public — "Who has access: Anyone" means anonymous, and a
 *  URL is not a credential. THIS is the authentication. Apps Script has no
 *  constant-time compare, so this is a length-then-xor loop; the secret is
 *  high-entropy and Google's own scheduling noise dominates any residual signal. */
function authorized_(e, body) {
  var got = String((body && body.secret) || (e && e.parameter && e.parameter.secret) || '');
  if (got.length !== SHARED_SECRET.length) return false;
  var diff = 0;
  for (var i = 0; i < got.length; i++) diff |= got.charCodeAt(i) ^ SHARED_SECRET.charCodeAt(i);
  return diff === 0;
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o))
    .setMimeType(ContentService.MimeType.JSON);
}

/** Header name → column index, matched case-insensitively so column ORDER may
 *  change but names may not. */
function headerMap_(sh) {
  var head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var map = {};
  for (var i = 0; i < head.length; i++) {
    map[String(head[i]).trim().toLowerCase()] = i + 1;
  }
  return map;
}

/* ── Prices ─────────────────────────────────────────────────────────────── */

function prices_(p) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(PRICES_SHEET);
  if (!sh) return { ok: false, error: 'missing_sheet', sheet: PRICES_SHEET };

  var values = sh.getDataRange().getValues();
  if (values.length < 2) return { ok: true, rows: [], total: 0 };

  var head = values[0].map(function (h) { return String(h).trim().toLowerCase(); });
  var col = function (name) { return head.indexOf(name); };

  var q        = String(p.q || '').trim().toLowerCase();
  var category = String(p.category || '').trim().toLowerCase();
  var sku      = String(p.sku || '').trim().toLowerCase();
  var limit    = Math.min(Number(p.limit) || 25, 100);

  var rows = [];
  for (var r = 1; r < values.length && rows.length < limit; r++) {
    var row = values[r];
    var get = function (name) { var i = col(name); return i < 0 ? '' : row[i]; };

    var rowSku = String(get('sku')).trim();
    if (!rowSku) continue;
    if (String(get('available')).toLowerCase() === 'false') continue;

    if (sku && rowSku.toLowerCase() !== sku) continue;
    if (category && String(get('category')).trim().toLowerCase() !== category) continue;
    if (q) {
      var hay = [rowSku, get('name_ar'), get('name_en')].join(' ').toLowerCase();
      if (hay.indexOf(q) === -1) continue;
    }

    rows.push({
      sku:       rowSku,
      name_ar:   String(get('name_ar')),
      name_en:   String(get('name_en')),
      category:  String(get('category')).trim().toLowerCase(),
      unit:      String(get('unit')),
      price:     Number(get('price')) || 0,
      currency:  String(get('currency') || 'SAR'),
      stock:     String(get('stock') || 'in').toLowerCase(),
      lead_days: Number(get('lead_days')) || 0
    });
  }
  return { ok: true, rows: rows, total: rows.length, updated_at: new Date().toISOString() };
}

/* ── Quotes ─────────────────────────────────────────────────────────────── */

function appendQuote_(b) {
  if (!b.ref) return { ok: false, error: 'missing_ref' };

  // Concurrent appends otherwise interleave and getLastRow() lies.
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return { ok: false, error: 'busy' };   // declared retryable
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName(QUOTES_SHEET);
    if (!sh) return { ok: false, error: 'missing_sheet', sheet: QUOTES_SHEET };

    var head = headerMap_(sh);
    var refCol = head['ref'];
    if (!refCol) return { ok: false, error: 'missing_sheet', detail: 'the Quotes tab has no Ref column' };

    // Idempotent on `ref`: the platform retries a failed delivery, and a retry must
    // not file the same RFQ twice.
    var last = sh.getLastRow();
    if (last > 1) {
      var refs = sh.getRange(2, refCol, last - 1, 1).getValues();
      for (var i = 0; i < refs.length; i++) {
        if (String(refs[i][0]).trim() === String(b.ref).trim()) {
          var existing = i + 2;
          return { ok: true, deduped: true, row: existing, row_url: rowUrl_(sh, existing) };
        }
      }
    }

    var width = sh.getLastColumn();
    var out = new Array(width);
    var put = function (name, value) {
      var c = head[name];
      if (c) out[c - 1] = value === undefined || value === null ? '' : value;
    };
    put('ref', b.ref);
    put('created_at', new Date());
    put('customer', b.customer);
    put('phone', b.phone);
    put('sku', b.sku);
    put('material', b.material);
    put('qty', b.qty);
    put('unit', b.unit);
    put('unit_price', b.unit_price);
    put('total', b.total);
    put('currency', b.currency || 'SAR');
    put('site', b.site);
    put('address', b.address);
    put('status', 'new');

    sh.appendRow(out);
    var written = sh.getLastRow();
    return { ok: true, deduped: false, row: written, row_url: rowUrl_(sh, written) };
  } finally {
    lock.releaseLock();
  }
}

function rowUrl_(sh, row) {
  return SpreadsheetApp.getActiveSpreadsheet().getUrl()
    + '#gid=' + sh.getSheetId() + '&range=A' + row;
}

/* ── The callback into Octwin ────────────────────────────────────────────────
   INSTALLABLE trigger only. A *simple* trigger named `onEdit` cannot call any
   service that requires authorization — including UrlFetchApp — so it would fail
   silently. Named `onSheetEdit` so it can never be mistaken for one.

   A useful property falls out of that choice: an installable onEdit does NOT fire
   for script or API writes, so our own appendQuote_ can never re-trigger this. No
   loop is possible from this end.                                              */

function onSheetEdit(e) {
  if (!e || !e.range) return;
  var sh = e.range.getSheet();
  // Cheapest exits FIRST: total trigger runtime is capped PER DAY, not per call.
  if (sh.getName() !== QUOTES_SHEET) return;
  if (e.range.getNumRows() !== 1 || e.range.getRow() === 1) return;

  var head = headerMap_(sh);
  if (e.range.getColumn() !== head['status']) return;

  var ref = String(sh.getRange(e.range.getRow(), head['ref']).getValue() || '').trim();
  if (!ref) return;

  postToOctwin_({
    event:     'quote_status',
    ref:       ref,
    status:    String(e.value || e.range.getValue() || '').trim().toLowerCase(),
    row:       e.range.getRow(),
    row_url:   rowUrl_(sh, e.range.getRow()),
    edited_by: (e.user && e.user.getEmail && e.user.getEmail()) || '',
    edited_at: new Date().toISOString()
  });
}

function postToOctwin_(payload) {
  var body = JSON.stringify(payload);
  var ts   = String(Math.floor(Date.now() / 1000));
  var sig  = 'v1=' + hmacHex_(OCTWIN_INBOUND_SECRET, 'v1:' + ts + ':' + body);

  var res = UrlFetchApp.fetch(OCTWIN_INBOUND_URL, {
    method: 'post',
    contentType: 'application/json',
    payload: body,
    headers: { 'X-Octwin-Timestamp': ts, 'X-Octwin-Signature': sig },
    // Without this a 401 THROWS and the trigger dies with nothing in the log you
    // would think to look at.
    muteHttpExceptions: true,
    followRedirects: true
  });
  var code = res.getResponseCode();
  if (code >= 300) {
    console.error('octwin inbound ' + code + ': ' + res.getContentText().slice(0, 300));
  }
  return code;
}

/**
 * HMAC-SHA256 → lowercase hex, byte-identical to Node's
 * createHmac('sha256', secret).update(message, 'utf8').digest('hex').
 */
function hmacHex_(secret, message) {
  // The 3-arg overload: the charset is load-bearing — RFQ payloads carry Arabic.
  var raw = Utilities.computeHmacSha256Signature(message, secret, Utilities.Charset.UTF_8);
  var hex = '';
  for (var i = 0; i < raw.length; i++) {
    // (b + 256) % 256 is NOT optional. Apps Script returns Java SIGNED bytes, so
    // 0x8A arrives as -118 and b.toString(16) yields '-76'. Every signature then
    // fails verification with no error anywhere — you just get 401s.
    var b = (raw[i] + 256) % 256;
    hex += (b < 16 ? '0' : '') + b.toString(16);
  }
  return hex;
}

/* ── Run these two ONCE from the editor ─────────────────────────────────── */

/** Install the trigger. Idempotent — deletes any previous copy first. Running this
 *  is what triggers the OAuth consent screen, and that consent is what authorizes
 *  UrlFetchApp. Without it the callback cannot leave Google. */
function installTrigger_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'onSheetEdit') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('onSheetEdit').forSpreadsheet(ss).onEdit().create();
}

/** Turn the Status column into a closed dropdown. This is the real fix for stray
 *  statuses: a validated enum at the SOURCE beats string-matching "Shipped ✅" on
 *  our side, and the platform is declared to REJECT an unrecognised stage rather
 *  than guess. */
function installValidation_() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(QUOTES_SHEET);
  if (!sh) throw new Error('no sheet named ' + QUOTES_SHEET);
  var head = headerMap_(sh);
  if (!head['status']) throw new Error('the Quotes tab has no Status column');
  var rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(STATUSES, true).setAllowInvalid(false).build();
  sh.getRange(2, head['status'], 500, 1).setDataValidation(rule);
}
```

## Deploy checklist

1. **Deploy → New deployment → Web app.**
2. **Execute as: Me.** The script needs your authority over the sheet *and* over
   `UrlFetchApp`.
3. **Who has access: Anyone.** This means anonymous — no Google sign-in. That is
   required for a server-to-server call, and the shared secret is what actually
   protects the sheet.
   > Choosing *"Anyone with a Google Account"* instead is the single most common
   > mistake. It serves an HTML sign-in page **with HTTP 200**, so it looks like
   > success. The platform catches it as `non_json_response`.
4. Copy the `/exec` URL. **Never use `/dev`** — it is editor-only and needs a
   signed-in session. The console rejects it on save.
5. Run `installValidation_` then `installTrigger_` from the editor, accepting the
   consent prompt.

⚠️ **Redeploying after a code change:** *Deploy → Manage deployments → ✏️ edit →
Version: New version → Deploy*. Using *New deployment* again mints a **new URL** and
the console will keep calling the old one.

## Quotas worth knowing

| | Consumer account | Google Workspace |
|---|---|---|
| UrlFetch calls | 20,000 / day | 100,000 / day |
| Script runtime | 6 min / execution | 6 min / execution |
| **Trigger runtime** | **90 min / day** | **6 hr / day** |

Trigger runtime per *day* is the binding limit on a busy sheet, which is why
`onSheetEdit` exits before touching any range when the edit is not a Status cell.
