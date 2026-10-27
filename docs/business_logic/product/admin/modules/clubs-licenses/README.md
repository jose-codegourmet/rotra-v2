# Clubs and licenses

**Status:** Confirmed v1 target rules. Updated October 27, 2026: club provisioning and per-club prices, settled with the [ROTRA Admin prototype](../../../../../frames/admin-app/rotra-admin.html).

## Club identity

Each club has a dedicated username/password and a fixed founding address. It may hold sessions at different courts/locations. New player IDs use the founding city of the club that first creates/syncs the profile, not the session venue.

The club account combines owner/manager and Queue Master authority. Named manager accounts and delegation are deferred.

## Adding a club

The platform owner adds every club in Admin; clubs do not apply. Adding a club needs:

- **Name:** unique among clubs.
- **Founding address and city:** fixed once saved. The city sets the club's RTR city code for new player IDs.
- **Username:** the club's sign-in name for the Queue app, suggested from the club name. Lowercase letters and numbers, optionally separated by dots, 3–30 characters, unique.
- **Initial password:** at least 8 characters, set by the platform owner and given to the club outside ROTRA. The club can change it later from Club settings. ROTRA never shows it again after the club is created.
- **Price:** a monthly and yearly price, or Free (see below).

The platform owner reviews these before creating the club. A new club has no license, so it cannot use the Queue app until the platform owner activates one.

The club changes its own **logo** from Club settings. A **name change is a request**: the club submits the new name, and it only takes effect after the platform owner approves it in Admin; until then the old name shows everywhere and the club can cancel the request. One pending request at a time. Sending one needs internet. The founding address and city code stay fixed.

The club can **change its own password** from Club settings by entering the current password correctly; the new one applies to every device that signs in to the club account. A forgotten password is reset by the platform owner. Club settings as a whole need internet; offline, the page says so and shows nothing else.

## License payment history

Each manual activation records a license payment the club can see in Club settings: date paid, plan (monthly or yearly), the period it covers, amount, and a reference. The club can export this history as CSV. These are records of payments made outside ROTRA; ROTRA does not take the payment.

## Commercial model

- Monthly and yearly licenses; yearly gets a discount.
- **No fixed price.** Each club has its own monthly and yearly price in pesos, whole amounts above zero, set by the platform owner when the club is added and changeable from the club's License tab. The yearly price must be less than twelve times the monthly price.
- **Free clubs.** Instead of a price, the platform owner can make a club Free, for example a tester club. A free club still gets monthly or yearly license terms from the platform owner, so access, expiry and public-page retention work exactly as for a paying club. Each term is recorded at ₱0 and shown as Free. Switching a club back to paid keeps its last paid price as the starting value.
- Payment is collected manually outside ROTRA.
- The platform owner activates and renews access manually in Admin. The amount is filled in from the club's current price for the chosen plan and can be changed for that payment.
- Changing a club's price, or making it free, affects later payments only. Recorded payments keep the amount they were recorded with.
- One active session per club at a time, regardless of venue or device.
- Renewal effective-date rules (early renewal, overlapping terms) and refunds have not been specified.

## Expiry

An expired club cannot use the Queue app, including its saved players and historical reports. There is no ordinary read-only club-account grace period.

**Exception:** a session already active at expiry may finish and sync. Starting a new session requires renewal. Offline entitlement enforcement must preserve this exception without allowing unlimited new offline sessions; the mechanism is not chosen.

## Public pages and retention

- Published session pages become stale after license expiry.
- Delete those public pages after **six months of continuous expiry**.
- Renewal within the retention period restores the pages and cancels pending deletion.
- A later expiry starts a fresh six-month countdown.
- Deleting pages does not delete players' completed match history or earned rankings.

Exact stale-page presentation is undecided. The six-month decision applies to public pages; retention of other internal club data was not specified. Do not expand it into a destructive club/profile purge.

Previously earned rank/history remains stored, but normal rolling-window leaderboard/rank rules still apply. Retention does not freeze a player's leaderboard eligibility forever.

See [license flow](flow/license-lifecycle.md).
