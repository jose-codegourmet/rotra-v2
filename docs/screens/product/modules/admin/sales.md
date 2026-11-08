# Admin — Sales

**Audience:** platform owner. **Surface:** `A-SALES`, route `/sales`, left navigation item **Sales** (below Players).

Owner request, November 8, 2026: a sales page to track revenue, matches and sessions started. Mockup first; the real numbers and queries are not decided (see below).

## What it shows
- Header “Sales” with “License revenue, sessions started and matches played, across every club”.
- A **period switch**: Last 7 days, **Last 30 days** (default), Last 12 months. Days are daily bars, 12 months is monthly bars.
- Three **number cards**, each with the total for the period, a chip comparing it with the period before (▲ green up, ▼ amber down, “No change”, “New”, or “Not enough history to compare” when the earlier period starts before the first recorded license) and a bar chart of the period (the newest bar is full strength, hover shows the value):
  - **Revenue**: the money clubs paid for licenses, summed by the date you recorded each payment.
  - **Sessions started**: sessions that moved from prepared to live.
  - **Matches played**: matches finished in those sessions.
- **Revenue by plan**: Monthly and Yearly totals and the number of payments each.
- **Recent payments**: the latest six payments in the period (club name opens the club, plan, paid date, amount; ₱0 shows as Free).
- **Most active clubs**: club, sessions, matches and money paid in the period, ordered by matches. The club name opens the club.
- Empty periods say what is missing (“No payments were recorded last 7 days.”).

## Rules
- ROTRA does not collect money. Revenue is only the license payments the owner records when activating or renewing, as on the club's Payment history.
- Sessions and matches count only what finished or started in the period; invalid or cancelled sessions do not count as started.
- The prototype uses the real sample payments for revenue and generated sample figures for sessions and matches.

## Not decided yet
- Whether revenue is shown by the day paid (as here) or spread over the days the license covers.
- Whether free (tester) clubs are counted in sessions and matches (assumed yes) and shown on the list.
- Where the numbers are calculated and how they are produced: see [D-2026-11-08-01](../../../../mvp/decisions.md#d-2026-11-08-01) (owner leans to Supabase/Postgres; no scheduled job assumed).
