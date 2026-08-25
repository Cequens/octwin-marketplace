# heshamrabea — Hesham Rabea barbershop bot

A pure-YAML Octwin pack for the Hesham Rabea men's barbershop chain (Cairo). WhatsApp + web,
Arabic. It answers questions and takes appointments.

## What it does

- **Main menu** (`home`) — front door shown on a greeting / unclear message.
- **Book** (`book`) — appointment journey: **branch → barber → service → time slot → confirm → reserved**,
  with a 2-hour reminder. Barbers are filtered to the chosen branch.
- **Services** (`services` → `service_list`) — service categories with prices (EGP).
- **Branches** (`branches`) — all 16 locations; tap one to book there.
- **Contact** (`contact`) — phone + hours, with a one-tap call button.
- **FAQ** (`faq`) — booking, payment, walk-ins, kids.

## Data model

- `xrm.yaml` — `branch`, `professional` (the bookable resource), `service`, and an extended
  `booking` system entity. Demo data seeds 16 branches, 32 barbers, 23 services.
- `scheduling.yaml` — makes each `professional` bookable, 10:00–23:30 daily, 30-min slots,
  a 2-hour reminder.

## ⚠️ Placeholder data to replace

- **Barber names are placeholders** (`كابتن أحمد`, `كابتن محمود`, … — 2 per branch). The website
  lists no individual barbers. Replace the `professional` rows in `xrm.yaml` `demo:` with the real
  roster, then `octwin deploy --seed`.
- **Availability** is seeded per barber in `scheduling.yaml` (uniform hours). If barbers work
  different shifts, edit their `rules:` blocks. (Availability must be seeded per barber by unique
  `name` — a bulk field-match currently attaches rules only once; see FEEDBACK.md.)
- **Service prices/durations** in `xrm.yaml` `demo:` are from the public site (July 2026) — keep them current.
- **Branch addresses/map links** are not modeled (site shows only areas). Add `address`/`geo` fields
  to `branch` if you want them on the card.

## Develop

```bash
octwin validate --remote      # full platform check (offline: octwin validate)
octwin deploy --seed          # deploy + seed demo data (idempotent; reuses media)
octwin status                 # confirm ✓ live and current
octwin chat "أهلا" --as me    # drive a conversation headlessly; taps print with ids
```

Deploy target comes from your saved `octwin login` (tenant `ammar`, project `hisham-rabea`).
The per-pack `pack.json` this line used to name was retired 2026-07-29 — it was a second home
for a fact `login` already holds, and a committed copy shipped one developer's pins to everyone.

> Note: `required_adapters` is `[messaging]` only — XRM uses the platform's bundled data store.
> Adding `data-store` makes an explicitly-provisioned store a hard deploy requirement (see FEEDBACK.md).
