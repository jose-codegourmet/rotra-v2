# Player oversight and contact-change requests

**Surfaces:** `A-PLAYERS`, `A-PLAYER-DETAIL`, `A-CONTACT-REQUESTS`, `A-CONTACT-REVIEW`.

**Source:** [player management rules](../../../../business_logic/product/admin/modules/player-management/README.md).

## A-PLAYERS — Identity directory

Show name/nickname, permanent RTR ID, claimed/unclaimed identity state, shared-rank status, and sufficient permitted internal identifiers to locate a request. Phone/email search is privileged internal functionality only if the identity-access design permits it; it must not leak into public search.

No fake row for every name-only guest is required: guests may exist only in club records. If an identity search has duplicates/conflicts, surface that explicitly rather than merging by display name.

**Page layout** (owner comment, November 8, 2026: the page looked bad and needed a new layout):
- Header: “Players” with “N players · permanent RTR IDs” under it, and **Add player** (plus icon) on the right on the same line, also on a phone.
- **Six small count cards** in one grid (owner comment, same day: make them cards again; they had been merged into one strip): Advanced, Intermediate, Beginner, No rank, Registered and Unclaimed, each a card with a small label over a large number (Registered and Unclaimed numbers in the accent color). Two per row on a phone, up to six in a row on a wide screen. Pressing Registered or Unclaimed filters the list; the level cards reset the account filter to All.
- One **toolbar** row: search, the account switch (All, Registered, Unclaimed), a **Filters** button and a List | Grid icon switch. **Filters** opens a panel (hidden by default; owner comment, same day: update how the filters look) laid out as a form: a grid of four labelled fields (**Added from**, **Added to**, **Place registered**, **Archive status**, two per row on a wide screen and one per row on a phone), a **Duplicates only** row with a switch and the hint “Duplicate matches share a normalized name, phone or email. Flag only; never merge.”, and a footer with **Clear filters** and **Done** (closes the panel).
- One **selection bar** above the list: “Select all on this page” and “Select all N matching”. The actions for the selected players are a **dock at the bottom of the screen** (owner comment, same day): it floats over the page and appears only while at least one player is ticked, with “N selected”, **Clear**, and the buttons Archive, Restore, Remove (danger style), Export CSV and Copy RTR IDs. The page gets extra bottom space while it is showing.
- Player rows (owner comment, November 8, 2026): pressing anywhere on a row opens the **Quick view** side panel for that player (name, RTR ID, rank chip, club and account state, private contact, recent games, **View full profile** and **View full history**); the row's checkbox, name button and “⋯” menu keep their own jobs and do not open it. A row has a pointer cursor and a hover highlight. Contents: checkbox, picture, then name (also opens Quick view; the panel (owner comments, same day: add some design, then keep it compact) has a header with the picture (tinted green only for a registered player; an unclaimed player's header is plain grey, owner comment, same day), the **name**, the **skill level** chip (“Advanced Low”, or “No rank yet”) and Registered/Unclaimed; then one short list with the **ID** (RTR ID with a Copy button), **Phone**, **Email** and **Socials** (a chip per social link the player added: Facebook, Instagram, YouTube, LinkedIn; each opens in a new tab; “None added” when empty); for an unclaimed player an **Invite to ROTRA** row under the header (“Not registered yet · Send an invite so this player claims the profile.”) whose button opens the same side panel as an invite view: the registration link in a read-only field, the notice “**No club is assigned.** A player who registers from an Admin link is not added to any club, and the clubs that already played with this profile keep their records as they are.”, the 7 days and single-use note, “ROTRA sends no email or text. Share the link yourself.”, **Back** and **Copy link** (owner comment, same day); a **History** block with the two latest sessions and wins–losses; and a fixed footer with **Edit**, **Full history** and **Full profile** (**Edit** switches the same side panel to the edit form, owner comment, same day: Admin can edit information too: **Full name**, **Nickname**, **Profile photo link** only for an unclaimed player (a registered player changes their own photo), a required **Reason for the change** and **Review changes**, with a **Back** button to the quick view and an **Email** field (prefilled; a new email is sent for review as a contact-change request and the current email stays until applied; disabled with a pointer to the Contact tab while the player has an open request; errors “Enter an email address, like name@example.com.” and “That email belongs to another ROTRA profile.”), a required **Reason for the change** and **Review changes**, with a **Back** button to the quick view and a note that phone, rank and the RTR ID cannot be edited here; the review step is the existing one, #343, with an Email row “old → new · Sent for review · not changed yet”; toasts: “Email change sent for review. Approve it on the Contact tab.”, “Profile saved. Email change sent for review.”, “Profile saved, but the email change wasn't sent.”; #564). The page buttons, which are pages, not dialogs, and **close the side panel** when they open; the panel also closes with its ×, the backdrop and Escape; owner comment, same day), RTR ID, chips and club on a column, and the “⋯” actions menu on the right, in one row on a phone too.
- **Grid view** (owner comment, same day: wasted white space): small vertical cards, at least 148 px wide, so two sit side by side on a phone and more fill a wide screen. Each card has the checkbox top left and the “⋯” menu top right, the picture centered under them, then the name, RTR ID, chips and the club and added date, all centered. **Dates read the way people say them** (owner comment, same day): the added date shows as “Added Jul 9, 2026”, not as the six digits taken from the RTR ID (070926), in the list and in the grid. Pressing the card opens the quick view like a list row.
- **Pagination** (owner comment, same day: it still looked bad): a bordered bar with “Showing 26–50 of 185” on the left, in the middle **‹ Prev**, numbered pages (the first, the last and the current page with its neighbors, with “…” for gaps; the current page is filled in the accent color) and **Next ›**, and **Rows** (25, 50, 100) on the right. On a phone the bar stacks centered and Prev and Next shrink to arrows so the controls stay on one line.

Pagination/search errors retain context. An empty result offers a correction to the search, not automatic account creation. The explicit header Add player action can create an unclaimed profile (#342).

## A-PLAYER-DETAIL — Internal identity view

Separate sections:

1. Permanent identity and public profile fields.
2. Private current phone/email and their relevant verification/application state.
3. Claimed account link/status and phone privacy preference.
4. Pending contact-change requests.
5. Read-only rank/history context needed for support: the page is split into **tabs** (owner comment, November 8, 2026): **Overview** (Identity, Account, Rank and games, and a small **Recent games** list of the three latest sessions with **View all**), **Contact** (Private contact and Contact-change requests; a “N open” chip when a request is waiting), **Game history** (the full list, newest first, each row with the session title, club, date and wins–losses; read-only) and **Activity** (Record of actions, with a count). “View full history” in the quick view opens the player page on the Game history tab; “View full profile” opens it on Overview.

Profile information oversight does not automatically authorize a rank editor, winner/score changes, hidden-contact sharing with clubs, account merging, or deleting retained game history. Admin may edit name and nickname for all players, plus photo for unclaimed players, and may enter a new email that is sent as a contact-change request, never applied directly (#564), with before/after review and a required reason (#343). Archive hides reversibly; Remove requires a typed RTR ID and reason and cannot remove a claimed account or any game history (#344).

Current contacts should reflect actual usable account state, not a merely approved but unapplied request. Audit/support details must not contain passwords or reusable recovery/claim tokens.

## A-CONTACT-REQUESTS — Review list

Rows: player/ID, requested field, request time, review/application status, and next permitted action. Proposed filters mirror actual Pending, Approved/applying, Applied, and Failed/needs-attention states. Rejected/not-approved representation awaits final policy but must not appear Applied.

Open review against the correct permanent ID, not a name-only match. Repeated requests for the same field need defined conflict behavior; flag them instead of processing stale values blindly.

## A-CONTACT-REVIEW — Approve and apply

Show existing private contact, proposed contact, request source/time, current account identity, and available verification evidence. Required evidence and approval criteria are unresolved; do not invent a government-ID upload requirement.

Before approval, identify conflicts: proposed phone already linked, email-login collision, changed original contact revision, or account/provider operation already in progress. These are not permission to merge unrelated player histories.

Proposed review actions: Approve, decline/request clarification where policy allows, and return without decision. Approval confirmation states the field and player, and that RTR ID/history remain unchanged. Do not claim it is a match-history correction.

After approval distinguish **Approved**, **Applying**, **Applied**, and **Application failed**. Show Retry application only for an idempotent approved operation; retry must not create a new identity or apply a stale request over a newer contact.

The provider and profile store can partially succeed. In that case display a bounded operational failure and actual account status; do not show a green “Contact changed” solely because approval was saved. Implementation must settle recovery/notification behavior before this action is considered complete.

## Record of actions

Each completed Admin decision can show actor/time and a concise change summary from its actual audit record. This is contextual history, not a new full audit-product screen. Redact passwords, tokens, and unnecessary contacts from general logs/exports.

## Acceptance examples

- An approved request that fails at the identity provider is not labeled Applied.
- A phone collision is not resolved by overwriting the other player.
- Contact changes keep RTR ID and match history intact.
- Even the player detail has no Edit winner or Manually reconstruct session action.

## Management controls (#335)

Six count cards follow filters. Search, duplicate groups, inclusive date range, city, archive state, page size (25/50/100), page and grid/list view survive URL reloads. Quick view uses `peek`, preserves list state and opens a right-side full-height panel. Detail and quick view link to `/players/[playerId]/games` with return context; the read-only history has counted, fun/partial and all tabs, club/date filters and ten sessions per page. Row actions and bulk selection follow the approved business rules.

Player selection uses compact standalone checkboxes: a narrow selection column in list view and a
checkbox in each card header beside the identity in grid/phone view. Do not repeat “Select <name>”
as visible text or add a full-width selection footer. Keep that player-specific accessible name,
visible keyboard focus, and a 44 px touch target (32 px desktop target). Selection must not open
quick view; existing selection and bulk-action behavior is unchanged (#392).

Player action menus render above the table/card scroll containers, stay inside the viewport, and
scroll internally when needed. Escape closes the menu and restores focus to its trigger.

## A-PASSWORD-REQUESTS — Password resets (#491)

`/requests/password-resets`, under Requests. Paginated newest-first cards show the submitted email,
request time, matched player name/RTR ID (or no eligible account), and Pending review, Link issued,
or Declined. Existing player details remain the support context. The request itself does not prove
ownership. Confirm “I have verified this player owns this account” before Generate reset link or
Replace reset link. Pending requests can be declined. No evidence upload or delivery channel is added.

The generated link appears only in the issuing response, with Copy link and instructions to share
privately with the verified player. It is not included in list/history reads, storage or analytics.
Link issued does not mean delivered or password changed. Replacement invalidates the earlier ROTRA
link; provider expiry applies. Show load, empty, retry, pending and mutation errors; preserve review
context after a failure. All reads/actions require the active platform-owner account and internet.
