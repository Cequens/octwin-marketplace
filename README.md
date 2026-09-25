# Octwin Marketplace

Conversational packs for [Octwin](https://octwin.ai) — Arabic-first WhatsApp and web products,
authored entirely in YAML.

A **pack** is a complete conversational product for one domain: its agent, its conversation flows,
its prompts, its data model and the back-office modules it turns on. Everything in this repository
is declarative — `.yaml`, `.md`, `.json` and images. There is no executable code in a pack, which is
what makes one safe to run on a shared platform alongside other tenants.

- **Platform:** <https://octwin.ai>
- **Browse the live catalog:** <https://octwin.ai/packs>
- **How the capabilities work:** <https://octwin.ai/artifacts>
- **CLI:** [`octwin-cli`](https://www.npmjs.com/package/octwin-cli) on npm

## The packs

23 published packs. Each links to its page on the marketplace, where you can read what it does
before you read how it does it.

### Retail & commerce

| Pack | What it does |
|---|---|
| [Storefront](https://octwin.ai/packs/octwin.ecommerce) | Catalogue, cart and checkout on WhatsApp, with Meta commerce sync |
| [Oud Atelier](https://octwin.ai/packs/octwin.oud-atelier) | A perfume boutique in chat — quiz, carousel, cart and checkout |
| [Binaa Building Supplies](https://octwin.ai/packs/octwin.binaa-supply) | Live prices from your own spreadsheet, quotes filed back into it, Slack in the loop |

### Healthcare

| Pack | What it does |
|---|---|
| [Clinic Appointments](https://octwin.ai/packs/octwin.clinic) | Arabic-first outpatient booking — doctors, slots and reminders |
| [Smile Dental](https://octwin.ai/packs/octwin.smile-dental) | Treatments, real availability, reminders and a rating that counts |
| [PharmaPlus Rx](https://octwin.ai/packs/octwin.pharmaplus-rx) | Prescription intake and refills — every clinical call left to a pharmacist |

### Services & field work

| Pack | What it does |
|---|---|
| [Glamour Salon](https://octwin.ai/packs/octwin.glamour-salon) | Stylist booking that respects how long a treatment really takes |
| [Hesham Rabea](https://octwin.ai/packs/octwin.heshamrabea) | Barber booking across every branch — pick the chair, not just the time |
| [HomeFix Services](https://octwin.ai/packs/octwin.homefix-services) | Fault to dispatched technician, routed by emirate with an SLA |
| [IronPulse Fitness](https://octwin.ai/packs/octwin.ironpulse-fitness) | Class seats that really run out, PT sessions and membership in chat |

### Hospitality & travel

| Pack | What it does |
|---|---|
| [Red Sea Resorts](https://octwin.ai/packs/octwin.redsea-resorts) | Room inventory that cannot be oversold, priced by board and party |
| [Shawarma Express](https://octwin.ai/packs/octwin.shawarma-express) | Menu, basket, checkout and live tracking — with an automatic nudge |
| [Umrah Journeys](https://octwin.ai/packs/octwin.umrah-journeys) | Packages, group booking and a visa file that a human really works |

### Automotive

| Pack | What it does |
|---|---|
| [MotorCare Service](https://octwin.ai/packs/octwin.motorcare-service) | Photo-to-triage, bay booking, and a workshop queue with an SLA |
| [XPeng Egypt](https://octwin.ai/packs/octwin.xpeng-egypt) | Browse models, book a test drive, and open after-sales tickets |

### Finance & insurance

| Pack | What it does |
|---|---|
| [Barakah Finance](https://octwin.ai/packs/octwin.barakah-finance) | Indicative instalments and a credit review a human actually makes |
| [Shield Motor](https://octwin.ai/packs/octwin.shield-motor) | Indicative quotes, and claims a human assessor actually decides |

### Logistics

| Pack | What it does |
|---|---|
| [SwiftShip Courier](https://octwin.ai/packs/octwin.swiftship-courier) | Tracking that never guesses, and claims a human actually decides |
| [Ride-hailing Support](https://octwin.ai/packs/octwin.kaiian) | Role-aware intake for passengers and captains, with human casework |

### Real estate, education, government, giving

| Pack | What it does |
|---|---|
| [Gulf Realty](https://octwin.ai/packs/octwin.gulf-realty) | Off-plan tours, payment plans and site viewings — booked in chat |
| [Nile Academy](https://octwin.ai/packs/octwin.nile-academy) | Admissions from enquiry to enrolment, with a funnel that is real |
| [Misr Digital](https://octwin.ai/packs/octwin.misr-digital) | Every government e-service — its documents, fees and timing — before you start |
| [Nakhla Giving](https://octwin.ai/packs/octwin.nakhla-giving) | Donations on WhatsApp, with a real payment gateway and a real receipt |

## What is in a pack

One directory per pack, and one `manifest.yaml` declares all of it:

```
clinic/
  manifest.yaml          agents, flow tools, channels, pre/post-turn hooks, env
  xrm.yaml               the pack's own records and their stage pipelines
  scheduling.yaml        resources, availability and booking rules
  flows/                 conversation flows — the YAML DSL
  prompts/               the agent's identity and instructions
  locales/               Arabic and English copy
  listing/               icon and the marketplace detail page
```

**A pack owns no database and ships no code.** Domain records live in the platform's own storage
modules — XRM for records with stage pipelines, catalog for products, casework for tickets — declared
in `xrm.yaml` and `worklist.yaml`. The platform rejects `.ts`, `.js`, `.sql`, HTTP routes and custom
primitives at deploy time, which is what lets a pack run on shared infrastructure without a review of
its source.

## Run one, or write your own

`clinic` is the reference pack — copy the directory and start from something that already works.

```bash
npx octwin-cli@latest init my-pack          # scaffold
npx octwin-cli@latest login                 # approve in the console; it saves its own token
npx octwin-cli@latest validate              # offline checks
npx octwin-cli@latest deploy                # live on your tenant, hot-loaded
```

The authoring reference — the flow DSL, every primitive, the declaration schemas — is published by
the platform itself rather than bundled here, so it never goes stale:

```bash
npx octwin-cli@latest platform-kb pull
```

## More

- **Octwin:** <https://octwin.ai>
- **Marketplace:** <https://octwin.ai/packs>
- **Guides and playbooks:** <https://octwin.ai/artifacts>
- **What a WhatsApp AI agent is:** <https://octwin.ai/whatsapp-ai-agent>
- **Feedback on the authoring surface:** [`FEEDBACK.md`](./FEEDBACK.md)

Octwin is by [CEQUENS](https://www.cequens.com/).
