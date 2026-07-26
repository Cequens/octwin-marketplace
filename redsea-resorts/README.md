# Red Sea Resorts — room inventory that cannot be oversold

A WhatsApp reservations desk for an Egyptian Red Sea resort group. Guests browse rooms, take a
real arrival date, and get a priced hold with a deposit — and the resort cannot sell the same room
twice.

## The inventory story

The bookable resource is a **room type**, not a person, and its slot capacity is the **number of
rooms of that type**. Ten sea-view rooms means ten guests can hold the same arrival date; the
eleventh gets the `full` port and is offered another date. The date picker shows the real remaining
count, so a guest watches availability closing.

**An honest limit:** the ledger claims the **arrival** slot, so a multi-night stay does not consume
the following nights. This pack therefore models availability as *"a room of this type is released
on this arrival date"* — which is how a small resort's allocation actually works — and the resort's
PMS remains the system of record for the night-by-night picture. That is stated in
`scheduling.yaml` rather than papered over.

## What the guest can do

| Journey | What happens |
|---|---|
| 🛏️ **Rooms** | Carousel with the real nightly rate per board basis. |
| 📅 **Book a stay** | Room → arrival date (a real inventory slot) → nights → adults + children → board, priced from the room's own three rates. The **occupancy limit is enforced** — a four-adult party is never put in a two-adult room. |
| 🧾 **My bookings** | Every stay, its stage, and the outstanding deposit. |

## A held room is not a confirmed booking

`book-stay` writes the stay at `held` and quotes the deposit; the stage hint says plainly that
confirmation follows the deposit. The bot never says "confirmed" on a hold — a guest discovering
that at the desk is the failure this avoids.

Children are charged a configurable share of the nightly rate, and the deposit is a configurable
percentage — both in `manifest.yaml` `config:`, so a revenue manager changes a number, not a flow.

```bash
octwin deploy --seed
octwin chat "عايز غرفة بإطلالة على البحر" --as tester
octwin scheduling --slots <roomTypeRecordId>
octwin analytics stay --funnel
```
