# Octwin Sales

Octwin's **own** AI Agent for the octwin.ai website's "Talk to us" chat — unlisted (`listing.public: false`).

- **home** — the menu.
- **book-demo** — collects name, company, work email, industry, monthly volume (+ optional phone and a note), confirms, saves a `lead` record (our CRM: Records → Lead), then offers a person now.
- **plans** — what each plan includes, with no prices (the octwin pricing guide's plans).
- **live-demos** — points to the marketplace's live demo AI Agents.
- **talk-to-sales** — hands the chat to the Sales queue in Live chat; when nobody can take it, offers to book a demo.

The facts the AI Agent may state live in `prompts/identity.md` and match the website. The platform installs this pack into an ordinary project of the demo workspace; the website shows the chat when the platform settings `site_chat.tenant_slug` + `site_chat.project_slug` name that project. The sales team are members of that workspace with project access **assigned** and a role on this project only.
