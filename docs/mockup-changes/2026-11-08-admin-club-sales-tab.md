# Club page gets a Sales tab

Status: IN MOCK APP — #504
Date: 2026-11-08
App: admin
Mockup: apps/mockup/admin-app/rotra-admin.html › Club page › Sales tab (after License)
Screen ID: A-CLUB-SALES (new)
Route: Sales tab (/admin/clubs/c1?tab=sales)
Components: sales-stat-card, admin-nav

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
- **Decided in [D-2026-11-08-01](../mvp/decisions.md#d-2026-11-08-01) (owner delegated, 2026-11-08): “revenue” is what the club pays ROTRA; cost per session is an Admin-editable setting starting at ₱15 (placeholder until the owner sets it); payments stay in the month paid.** The questions below are kept for history.
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

## Like for like
- Compare at: 375 px and 1280 px, dark and light, beside the mockup route above.
- States and copy: exactly as listed under What changed; each ticket repeats them as acceptance criteria.
- Known differences: the prototype’s “sample figures” notes are left out, since the real app counts final session and match rows

## Reuse plan
- Reuses `card/`, `chip/`, `data-table/`, `segmented-control/` (period switch); new `sales-stat-card/`, `bar-chart/`, `sales-breakdown-list/`, `club-sales-table/`
- New `packages/data/src/sales/`; reuses license and session types
- Shares work with: `2026-11-08-admin-sales-page`

## Tickets
- Epic: #504 (A06)
- #532 A06.1 · Sales components: stat cards, bar chart, breakdown lists, club sales table
- #533 A06.2 · Sales figures for the platform and per club
- #534 A06.3 · Sales page, navigation item and the club Sales tab
- #540 A06.4 · Sales report views in Postgres and the Admin real-mode reader
