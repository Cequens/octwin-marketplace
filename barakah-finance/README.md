# Barakah Finance — indicative instalments, and a credit decision no bot makes

A WhatsApp front desk for a Saudi Islamic home-finance provider. Customers compare published
products, get an indicative murabaha instalment in seconds, and submit a complete application —
and the eligibility decision goes to an underwriter with an SLA the customer is told honestly.

## The line, drawn in data

The `applicant` pipeline is `enquiry → estimated → documents_pending → submitted → withdrawn`.
**There is no approval stage** a flow could write. The decision lives on a `case` in the
`credit_review` queue, where the only approve/decline paths are underwriter dispositions
(`pre_approved` with an amount, `declined` with a reason, `docs_required`) — each relayed to the
customer automatically.

The prompt reinforces it, but the structure is what enforces it.

## What the customer can do

| Journey | What happens |
|---|---|
| 📋 **Products** | Murabaha, ijara and diminishing musharaka with their **published** profit rate, minimum down payment and maximum term. |
| 🧮 **Estimate** | Product → price band → down payment → tenor, priced from the product's own rate. Every input arrives through a picker carrying a real number, so the arithmetic never touches free text. |
| 📝 **Apply** | A full application, an explicit ✅ (which is also the credit-check consent), then a credit review with its real response window. |

## Two guards worth reading

- **The product's own caps decide what may be quoted.** A down payment under `min_down_pct` or a
  term over `max_years` is a *product mismatch*: the flow states the published limit and offers a
  different product rather than quoting a structure that does not exist.
- **The estimate is flat-rate and labelled indicative** on the card itself. It is never called an
  offer or a pre-approval.

```bash
octwin deploy --seed
octwin chat "كم القسط لعقار بمليون ونص؟" --as tester
octwin cases --queues
octwin analytics applicant --funnel
```
