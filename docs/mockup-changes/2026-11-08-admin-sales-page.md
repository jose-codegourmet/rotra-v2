# Admin gets a Sales page

Status: TICKETED — #504
Date: 2026-11-08
App: admin
Mockup: apps/mockup/admin-app/rotra-admin.html › new Sales page (left navigation, below Players)
Screen ID: A-SALES (new)
Route: Sales tab (/admin/clubs/c1?tab=sales)
Components: sales-stat-card, admin-nav

## What changed
- New navigation item **Sales** and a new page at `/sales`: a period switch (7 days, 30 days, 12 months), three
  number cards with a change chip and a bar chart (Revenue, Sessions started, Matches played), Revenue by plan,
  Recent payments and Most active clubs.
- Revenue uses the real sample license payments in each club's history. Sessions started and matches played are
  generated sample figures in the prototype.
- The Admin screen README no longer says the module has no analytics at all; it points to Sales.

## Why
- Owner comment on the artifact, November 8, 2026: I need a sales page where I can track revenue, matches and
  sessions started.

## Open questions for the owner
- Revenue by the date paid, or spread over the days each license covers?
- Free (tester) clubs: counted in sessions and matches? (Assumed yes.)
- Anything else on the page, such as renewals due, new clubs this month, or churn?

## Where the numbers are calculated
- Owner note, same day: Supabase (Postgres) rather than Next.js. Discussion and the AI recommendation live in
  docs/mvp/decisions.md, D-2026-11-08-01 (proposed, not approved).

## Docs updated
- Business logic: none yet; the page only reads what is already recorded
- Database design: none; the counts can be read from final session and match rows (no scheduled job assumed)
- Screen docs:
  - docs/screens/product/modules/admin/sales.md — new
  - docs/screens/product/modules/admin/README.md — Sales row; analytics sentence
  - docs/screens/product/modules/admin/access-navigation.md — navigation list and route

## Like for like
- Compare at: 375 px and 1280 px, dark and light, beside the mockup route above.
- States and copy: exactly as listed under What changed; each ticket repeats them as acceptance criteria.
- Known differences: none

## Reuse plan
- Reuses `card/`, `chip/`, `data-table/`, `segmented-control/` (period switch); new `sales-stat-card/`, `bar-chart/`, `sales-breakdown-list/`, `club-sales-table/`
- New `packages/data/src/sales/`; reuses license and session types
- Shares work with: `2026-11-08-admin-club-sales-tab`

## Tickets
- Epic: #504 (A06)
- #532 A06.1 · Sales components: stat cards, bar chart, breakdown lists, club sales table
- #533 A06.2 · Sales figures for the platform and per club
- #534 A06.3 · Sales page, navigation item and the club Sales tab
