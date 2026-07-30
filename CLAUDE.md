# octwin-marketplace — working notes

Pure-YAML Octwin packs. No `.ts`/`.js`, no custom primitives — the server rejects code on deploy.

## Bump the pack version on every change

**Any change to a pack must bump its `version:` in `manifest.yaml`.** The platform stores each
deploy as an immutable content-addressed artifact and `octwin status` compares the *installed*
version against what is live. Editing a pack without bumping means the console, the operator and
`status` all still report the old version while the behaviour has changed — there is no way to tell
from the outside which build a tenant is actually running.

- **patch** (`1.1.0` → `1.1.1`) — a fix that changes no declaration: copy, a prompt, a flow branch.
- **minor** (`1.1.0` → `1.2.0`) — a new or changed declaration: a field, a render intent, a flow,
  an entity, a new `xrm.yaml`/`scheduling.yaml` slot.
- **major** — a breaking change to stored data or to a flow's `input:` contract.

Quote it: `version: '1.1.0'`. A bare `1` parses as a number and fails validation.

## Validate before you claim anything works

```bash
octwin validate            # offline structural + render-intent + primitive-argument checks
octwin validate --remote   # the platform's FULL check — the only one that sees $bind.<path> reads
```

**`octwin validate` reads the KB from the PACK directory** (`<pack>/.octwin/platform-kb/`), not the
repo root. With no copy there it **silently skips** the render-intent and primitive-argument checks
and still prints a green `✓`. A `✓` with no `✓ render intents …` / `✓ primitive arguments …` line
above it means *not checked*, not *clean*. Pull into each pack after any platform upgrade:

```bash
octwin platform-kb pull    # run inside the pack directory
```

## The traps that have actually bitten this repo

These are recorded in [`BACKLOG.md`](BACKLOG.md) with evidence; the short forms:

1. **An unknown primitive argument is dropped, not rejected.** `booking_record_id`, `order`, `all`
   all read as working code and did nothing. Check `primitives/<name>.json` → `inputSchema`.
2. **A field that isn't on a port reads as `undefined`, and `undefined` is not inert.** `record_get`
   publishes `id`, not `record_id`; passing the absent value to `record_save` turned an update into
   an insert. Check `portSchemas`, not the argument list.
3. **Render intents do not share a field vocabulary.** `buttons` belongs to `detail_card`, not
   `text_card`. Read `render-intents/<intent>.json`.
4. **`record_aggregate` is project-wide by default** — the opposite of `record_list`. Without
   `contact_id: '$contact.id'` a home hub counts every customer's records as the caller's own.
5. **`active_only` defaults to true**, which hides every record in a terminal stage. Right for
   "what's open", wrong for any history view. Say `active_only: false` there, deliberately.
6. **Cite the pulled KB, never platform source.** A `src/platform/**` path is unopenable by a pack
   author and goes stale silently.
