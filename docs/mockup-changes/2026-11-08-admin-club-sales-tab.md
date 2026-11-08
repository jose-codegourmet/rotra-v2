# Club page gets a Sales tab

Status: NEW
Date: 2026-11-08
App: admin
Mockup: apps/mockup/admin-app/rotra-admin.html › Club page › Sales tab (after License)
Screen ID: A-CLUB-SALES (new)

## What changed
- New **Sales** tab on each club's page. It shows what the club pays ROTRA against how much it uses ROTRA over the
  last six months: Paid to ROTRA, Sessions started (and matches), Paid per session next to an estimated cost per
  session, a month-by-month table (Paid, Sessions, Matches, Paid per session, Est. cost, Left over) and a bar
  chart of the amount paid each month.
- Payments are the recorded license payments (by the month paid). Sessions and matches are sample figures. The cost
  per session is a placeholder (₱15).

## Why
- Owner comment on the artifact, November 8, 2026: add a tab called Sales on the club page to see how much we get
  from their payments, the relationship between their monthly payment and the revenue they pull in, and how much
  they cost per session they make.

## Open questions for the owner
- “Revenue they pull in”: read as what the club pays ROTRA in the month against its sessions. If you meant the
  money the club collects from its own players, ROTRA does not hold that (clubs collect it themselves), so it is not shown.
- What should the cost per session be, and what does it include (hosting, SMS, support)? ₱15 is a made-up placeholder.
- Spread a yearly payment over 12 months here, or keep it in the month paid?

## Where the numbers are calculated
- Owner note, same day: Supabase (Postgres) rather than Next.js. Discussion and the AI recommendation live in
  docs/mvp/decisions.md, D-2026-11-08-01 (proposed, not approved).

## Docs updated
- Business logic: none yet; pending the questions above
- Database design: none; the counts can be read from final session and match rows
- Screen docs: docs/screens/product/modules/admin/clubs-licenses.md — new A-CLUB-SALES section
