# Admin Players page gets a cleaner layout

Status: NEW
Date: 2026-11-08
App: admin
Mockup: apps/mockup/admin-app/rotra-admin.html › Players
Screen ID: A-PLAYERS

## What changed
- Before: six large stat cards, two toolbars with every filter always visible, a hint line, a select-all row, the
  list, the pager and a second bar of actions at the very bottom.
- After: a header with the player count and Add player; one compact count strip (Level and Account groups, each
  number pressable as before); one toolbar with search, the account switch, a **Filters** button (the extra filters
  and the duplicate hint move into a panel that is closed by default) and a List | Grid icon switch; one selection
  bar above the list whose bulk actions only show once a player is ticked; and tidier player rows that keep
  checkbox, picture, details and the actions menu on one line, also on a phone.
- Nothing about what Admin can do or see changed; the same fields, filters and actions are kept.

- **Fix:** the Players page buttons (Add player, the stat counts, Filters, List | Grid, Quick view, the actions
  menu, the pager, page size, Select all) used inline `onclick`/`onchange` handlers that could not reach the
  page script, so they did nothing. They now use the same `data-act` handlers as the rest of the Admin mockup.
  Behavior is as originally described; no rule or screen text changed because of this.

- Pressing a player row now opens the Quick view side panel (before, only the name link did). The checkbox, name
  button and “⋯” menu are unaffected (owner comment, same day).

- The Quick view panel now shows a **History** block (the three latest sessions with wins–losses). **View full
  profile** and **View full history** open the player page (history scrolled into view) and close the side panel.
  The player page has a new **Game history** section with the latest eight sessions (owner comment, same day).

- **Fix:** the Quick view side panel could not be closed (the ×, the dimmed backdrop and Escape did nothing, so the
  page looked frozen behind it). All three now close it (owner comment, same day).

- The Quick view panel is compact (owner comments, same day): a tinted header with picture, name, skill level chip
  and account chip; then ID (with Copy), Phone, Email and Socials (Facebook, Instagram, YouTube, LinkedIn chips that
  open in a new tab); a short History (two latest sessions); and a fixed footer with the two page actions. The social
  links in the prototype are drawn from the player's name; in the real app they come from the player's own profile.

- The Quick view footer has an **Edit** button that turns the side panel into the edit form (name, nickname, photo
  link for unclaimed players, required reason, Review changes, Back). Admin can already edit these fields by the
  existing rules (#343); contact details, rank and the RTR ID still cannot be edited (owner comment, same day).

- For an unclaimed player the Quick view has an **Invite to ROTRA** button that opens the registration link with a copy
  button and the notice that a player who registers from an Admin link is **not assigned to a club** (owner comment,
  same day). The Admin link itself already existed (#345); the “no club” rule was added to the business docs.
- The tinted header only shows for registered players.

- Grid view uses small vertical cards (checkbox and menu on top, centered picture, name, ID, chips, club), two per
  row on a phone, instead of wide list-style cards with empty space (owner comment, same day).

- The Filters panel is a proper form: four labelled fields in a grid, a Duplicates only row with a switch and the hint
  beside it, and a footer with Clear filters and Done (owner comment, same day).

- The player page is split into tabs: Overview (with a small Recent games list), Contact, Game history (the full
  list) and Activity. The quick view's “Full history” opens the Game history tab (owner comment, same day).

- The actions for selected players moved from the selection bar into a dock fixed at the bottom of the screen, shown
  only when someone is ticked, with a live “N selected” and Clear (owner comment, same day).

- Player rows and cards say “Added Jul 9, 2026” instead of “Added 070926” (owner comment, same day).

- Pagination is a proper bar: range text, Prev, numbered pages with gaps, Next and a Rows picker (owner comment, same day).

- The six counts are small cards again (not one strip), in a grid (owner comment, same day).

## Why
- Owner comment on the artifact, November 8, 2026: the Players page looked ugly; update the layout.
- Second owner comment, same day: “this doesn't work” on the page header; the Add player button and the other
  buttons were dead (see the fix above).

## Docs updated
- Business logic: none needed
- Database design: none needed
- Screen docs: docs/screens/product/modules/admin/players-requests.md — A-PLAYERS page layout
