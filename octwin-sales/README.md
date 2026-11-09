# Octwin Sales

Octwin's **own** AI Agent for the octwin.ai website's "Talk to us" chat — unlisted (`listing.public: false`).

- **home** — the menu.
- **book-demo** — collects name, company, work email, industry, monthly volume (+ optional phone and a note) as one form, offers the free 30-minute times on the shared **Octwin demos** calendar (`scheduling.yaml`: Sun–Thu 10:00–17:00, Riyadh time), confirms, reserves the slot (a `booking`), saves a `lead` at `demo_booked` (Records → Lead), and emails the confirmation. The address is saved on the contact, so `automation.yaml` emails a reminder a day and an hour before.
- **request-quote** — one form with what the price depends on (plan, customers' country, channels, AI conversations and business messages a month, console users, systems to connect, go-live), confirms, saves a `quote_request` (Records → Quote request: new → in review → quote sent → accepted / declined), keeps the email on the contact and emails a confirmation promising the quotation within 2 working days; `automation.yaml` opens a task for the team, due in 48 hours. The Pricing page's "Contact us" opens it with its plan.
- **send-message** — a message for the team (name, email, topic, message), confirms, saves a `contact_message` (Records → Contact message: new → replied → closed), keeps the email on the contact and emails a confirmation promising a reply within 1 working day; `automation.yaml` opens a task, due in 24 hours. The Contact page's form opens it with every answer, so the visitor only confirms. A Sales message also offers a demo.
- **plans** — what each plan includes, with no prices (the octwin pricing guide's plans).
- **live-demos** — points to the marketplace's live demo AI Agents.

There is **no live chat with a person**: a visitor reaches the sales team by booking a demo (or at sales@octwin.ai). The meeting link is sent by the team by hand — a booking creates none.

A website button may open the chat straight on a flow (`widget.entry_flows`): `book-demo` (with `industry` / `volume` / the visitor's details), `request-quote` (with `plan`), `send-message` (with `name` / `email` / `topic` / `message`), `live-demos`, `plans`.

The facts the AI Agent may state live in `prompts/identity.md` and match the website. The platform installs this pack into an ordinary project of the demo workspace; the website shows the chat when the platform settings `site_chat.tenant_slug` + `site_chat.project_slug` name that project. The sales team are members of that workspace with project access **assigned** and a role on this project only; they see the leads in Records and the booked demos on the scheduling page, where they also change the calendar's hours.
