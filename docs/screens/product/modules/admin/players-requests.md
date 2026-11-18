# Player oversight and contact-change requests

**Surfaces:** `A-PLAYERS`, `A-PLAYER-DETAIL`, `A-CONTACT-REQUESTS`, `A-CONTACT-REVIEW`.

**Source:** [player management rules](../../../../business_logic/product/admin/modules/player-management/README.md).

## A-PLAYERS — Identity directory

Show name/nickname, RTR ID, claimed/unclaimed identity state, shared-rank status, and sufficient permitted internal identifiers to locate a request. Phone/email search is privileged internal functionality only if the identity-access design permits it; it must not leak into public search.

No fake row for every name-only guest is required: guests may exist only in club records. If an identity search has duplicates/conflicts, surface that explicitly rather than merging by display name.

**Page layout** (owner comment, November 8, 2026: the page looked bad and needed a new layout):
- Header: “Players” with “N players” under it (“· permanent RTR IDs” was dropped on November 16, 2026, [D-2026-11-16-04](../../../../mvp/decisions.md#d-2026-11-16-04): Admin can change an RTR ID), and **Add player** (plus icon) on the right on the same line, also on a phone.
- **Six small count cards** in one grid (owner comment, same day: make them cards again; they had been merged into one strip): Advanced, Intermediate, Beginner, No rank, Registered and Unclaimed, each a card with a small label over a large number (Registered and Unclaimed numbers in the accent color). Two per row on a phone, up to six in a row on a wide screen. Pressing Registered or Unclaimed filters the list; the level cards reset the account filter to All.
- One **toolbar** row: search, the account switch (All, Registered, Unclaimed, and since November 16, 2026 **Details required**), a **Filters** button and a List | Grid icon switch. **Filters** opens a panel (hidden by default; owner comment, same day: update how the filters look) laid out as a form: a grid of four labelled fields (**Added from**, **Added to**, **Place registered**, **Archive status**, two per row on a wide screen and one per row on a phone), a **Duplicates only** row with a switch and the hint “Duplicate matches share a normalized name, phone or email. Flag only; never merge.”, and a footer with **Clear filters** and **Done** (closes the panel).
- One **selection bar** above the list: “Select all on this page” and “Select all N matching”. The actions for the selected players are a **dock at the bottom of the screen** (owner comment, same day): it floats over the page and appears only while at least one player is ticked, with “N selected”, **Clear**, and the buttons Archive, Restore, Remove (danger style), Export CSV and Copy RTR IDs. The page gets extra bottom space while it is showing.
- Player rows (owner comment, November 8, 2026): pressing anywhere on a row opens the **Quick view** side panel for that player (name, RTR ID, rank chip, club and account state, private contact, recent games, **View full profile** and **View full history**; since November 13, 2026 a new-tab icon right of the name opens the player's public ROTRA profile in a new tab, and the footer reads **Edit**, **Full history**, **Share profile** and **Full profile**: Share profile opens the share dialog with Story, Facebook post and Square images of the picture, display name, RTR ID and this year's win rate, games, W and L, then **OR** and the **Profile link** field, with **Back** to the quick view; none without an RTR ID; [log](../../../../mockup-changes/2026-11-13-profile-card-open-share.md)); the row's checkbox, name button and “⋯” menu keep their own jobs and do not open it. A row has a pointer cursor and a hover highlight. Contents: checkbox, picture, then name (also opens Quick view; the panel (owner comments, same day: add some design, then keep it compact) has a header with the picture, the **name**, the **skill level** chip (“Advanced Low”, or “No rank yet”) and Registered/Unclaimed — since November 13, 2026 ([D-2026-11-13-03](../../../../mvp/decisions.md#d-2026-11-13-03)) a **banner card** like the Queue and Player profile dialogs: the player's banner (the default banner for unclaimed players and players with no pick), the picture overlapping it, then the name and chips (this replaced the green/grey tinted header). Since D-2026-11-13-04 the panel has no title bar: the top half of the 5:2 banner (a 5:1 strip) starts at the panel's top edge with the picture centred on its bottom edge, a frosted 30 px round × floats on it, and the name block reads the nickname (else the full name) in bold, the full name under it when there is a nickname, then a small **RTR ID** copy button (toast “RTR ID copied”); then one short list with **Phone**, **Email** and **Socials** (a chip per social link the player added: Facebook, Instagram, YouTube, LinkedIn; each opens in a new tab; “None added” when empty); for an unclaimed player an **Invite to ROTRA** row under the header (“Not registered yet · Send an invite so this player claims the profile.”) whose button opens the same side panel as an invite view: the registration link in a read-only field, the notice “**No club is assigned.** A player who registers from an Admin link is not added to any club, and the clubs that already played with this profile keep their records as they are.”, the 7 days and single-use note, “ROTRA sends no email or text. Share the link yourself.”, **Back** and **Copy link** (owner comment, same day); a **Latest stats** (left out when the player turned off Show my profile stats, whoever looks: the Queue Master and Admin included; the year as a chip; split in two on the podium's green grid background: the left 30% is **Win rate**, a big accent percentage with a pixel fire beside it that grows with the rate; the right 70% has “Latest stats” and the year over Games, Wins and Losses, [mockup log](../../../../mockup-changes/2026-11-13-profile-stats-redesign.md)) box (Games, Wins, Losses, Win rate in a 2 × 2 grid for this calendar year, reset on January 1, from the same games as History; “No games yet this year”) the same as the other apps' profile dialogs; a **History** block with the two latest sessions and wins–losses; and a fixed footer with **Edit**, **Full history** and **Full profile** (**Edit** switches the same side panel to the edit form: see [A-PLAYER-EDIT](#a-player-edit--edit-a-player-everything-the-player-can-change) below; this replaced the November 8 name/nickname/email-request form of #343 and #564 on November 9, 2026). The page buttons, which are pages, not dialogs, and **close the side panel** when they open; the panel also closes with its ×, the backdrop and Escape; owner comment, same day), RTR ID, chips and club on a column, and the “⋯” actions menu on the right, in one row on a phone too.
- **Unclaimed players** (owner, November 16, 2026, [D-2026-11-16-04](../../../../mvp/decisions.md#d-2026-11-16-04); this replaces the November 12 rule that an unclaimed record has a phone and no RTR ID; [log](../../../../mockup-changes/2026-11-16-admin-unclaimed-rtr-id-edit.md)): an unclaimed player is a person a club saved with a required email, and has an RTR ID from the moment the club saves them. They are listed like any row with the Unclaimed chip, their RTR ID and their email, and the RTR ID search finds them. One email is one person and one RTR ID, also when several clubs saved them.
  - **Details required:** an older unclaimed record with a phone and no email shows a warning chip **Details required** next to Unclaimed (list, grid, quick view and the player page). The quick view and the player page's Account card show the notice “**Details required.** This older record has a phone and no email. <Club> must add an email or delete the record.” The account switch's **Details required** option lists only these.
  - **More than one club:** the row's club line reads “<First club> and N more club(s)”. The quick view (a **Created by** row), the Edit profile read-only block and the player page's Identity card list each club as “<Club> · saved as **<that club's name for the person>**”, with the line “Saved by more than one club. Not on the leaderboard until they register.” Their rank chip is **Not on leaderboard** and the rank text ends “· not on the leaderboard until they register”.
- **Grid view** (owner comment, same day: wasted white space): small vertical cards, at least 148 px wide, so two sit side by side on a phone and more fill a wide screen. Each card has the checkbox top left and the “⋯” menu top right, the picture centered under them, then the name, RTR ID, chips and the club and added date, all centered. **Dates read the way people say them** (owner comment, same day): the added date shows as “Added Jul 9, 2026”, not as the six digits taken from the RTR ID (070926), in the list and in the grid. Pressing the card opens the quick view like a list row.
- **Pagination** (owner comment, same day: it still looked bad): a bordered bar with “Showing 26–50 of 185” on the left, in the middle **‹ Prev**, numbered pages (the first, the last and the current page with its neighbors, with “…” for gaps; the current page is filled in the accent color) and **Next ›**, and **Rows** (25, 50, 100) on the right. On a phone the bar stacks centered and Prev and Next shrink to arrows so the controls stay on one line.

Pagination/search errors retain context. An empty result offers a correction to the search, not automatic account creation. The explicit header Add player action can create an unclaimed profile (#342).

## A-PLAYER-DETAIL — Internal identity view

Separate sections:

1. Identity (name, nickname, RTR ID, created date and club) and public profile fields. Under the RTR ID: “A contact change doesn't change the RTR ID. Admin can change it from Edit profile, by changing the registration place or date.”
2. Private current phone/email and their relevant verification/application state.
3. Claimed account link/status and phone privacy preference.
4. Pending contact-change requests.
5. Read-only rank/history context needed for support: the page is split into **tabs** (owner comment, November 8, 2026): **Overview** (Identity, Account, Verification for registered players, Rank and games, and a small **Recent games** list of the three latest sessions with **View all**), **Contact** (Private contact and Contact-change requests; a “N open” chip when a request is waiting), **Game history** (the full list, newest first, each row with the session title, club, date and wins–losses; read-only) and **Activity** (Record of actions, with a count). “View full history” in the quick view opens the player page on the Game history tab; “View full profile” opens it on Overview.

Profile information oversight does not automatically authorize a rank editor, winner/score changes, hidden-contact sharing with clubs, account merging, or deleting retained game history. Admin may edit every field the player can, plus phone, email and (for MVP or beta only) the password, with a required reason ([A-PLAYER-EDIT](#a-player-edit--edit-a-player-everything-the-player-can-change), D-2026-11-09-14; this replaced the November 8 rule that a new email is only sent as a contact-change request, #564). Archive hides reversibly; Remove requires a typed RTR ID and reason and cannot remove a claimed account or any game history (#344).

Current contacts should reflect actual usable account state, not a merely approved but unapplied request. Audit/support details must not contain passwords or reusable recovery/claim tokens.

### Verification

The **Verification** card sits below **Account** on **Overview** for registered players ([D-2026-11-16-02](../../../../mvp/decisions.md#d-2026-11-16-02), [mockup log](../../../../mockup-changes/2026-11-18-admin-player-verification.md)). The status chip reads **Not verified · N of 3**, **Verified**, or **Verified by Admin**. All three check rows stay visible even when the override is active. Each row shows a check icon when complete and its step number otherwise.

| Check | Details |
|---|---|
| **Google account** | “Connected · <Google email>” or “Not connected” |
| **Mobile number** | “On file · <masked phone>” or “Not on file” |
| **ROTRA email matches Google** | “Both are <email>”, “Google must be connected first.”, or “ROTRA email: <ROTRA email>. Google email: <Google email>.” An open request to change to the Google email adds **Change sent for Admin review**. |

**Set Verified by Admin** opens a confirmation sheet; while the override is active the card offers **Clear override**. The sheet shows the player, RTR ID, current status, and status after saving. Both actions require **Reason for the change**. Cancel closes the sheet. A failed save preserves the reason and leaves the status and audit record as they were. A successful save closes the sheet, refreshes the card, and adds the action and reason to **Activity** › **Record of actions**.

## A-PLAYER-EDIT — Edit a player: everything the player can change

Owner comments on the Admin artifact, November 9, 2026: “admin should be able to edit the image. show the image picker for avatars” and “since admin you should be able to edit everything. also password (for now) wrap it with *(for mvp or beta only)*” ([D-2026-11-09-14](../../../../mvp/decisions.md#d-2026-11-09-14)). Opened by **Edit** in the quick-view side panel; **Back** returns to the quick view. A one-line intro: “As the platform owner you can change everything a player can, plus their sign-in details. Every save is recorded with your reason.”

| Section | Controls and rules |
|---|---|
| Profile picture | A 72 px preview with its label (Photo, Character or Initials) and “Current picture” / “Changes when you save”. **Upload a photo** (PNG, JPG or WebP, up to 1 MB, cropped to a square; errors “Choose a PNG, JPG or WebP image.”, “That image is over 1 MB. Choose a smaller one.”, “That file couldn't be read as an image.”), **Use initials**, a **Previous picture** row with **Use previous picture** when one exists (keep-two rule, D-2026-11-09-10), and “Or pick a character”: only the **shown** images of [A-CHARACTERS](configuration.md#a-characters--profile-characters), 15 per page, with a pager “‹ Previous · Page N of M · Next ›”. A character keeps showing for the player if it is later hidden or deleted. |
| Name | Full name (required, under 60 characters), Nickname (optional, under 30). |
| Playing style | Playing style (optional, up to 280 characters); Experience years (0–80) and months (0–11); Playing since month and year (1950 to this year). |
| Links | Facebook, Instagram, YouTube, LinkedIn: optional, each must be a link on that site (for example “Use a Facebook link, like https://facebook.com/name.”). |
| Privacy | **Private profile** and **Hide phone number from clubs** switches, as the player has them. |
| Account | Phone (shown grouped, “+63 917 555 0142”, and grouped while typing; saved as E.164; at least 10 digits; unique: “This phone number is already linked to another player.”) and Email (format; unique: “This email is already linked to another player.”; required for a registered player, and for an unclaimed player who has one: “An unclaimed player needs an email. Enter one.”). A registered player's change applies straight away, without a contact-change request. Hint for an unclaimed player: “The club entered these and can't change the email. You can. The player hasn't registered yet.”; for a Details required record: “Details required: this older record has no email. The club must add one or delete the record. You can add it here.” **Password *(for MVP or beta only)*** — exactly that label: show/hide, at least 8 characters, empty keeps the current password, disabled for an unclaimed player (“This player hasn't registered, so there's no password to replace.”). The new password is never shown again; Admin gives it to the player. Only “Last set by Admin <time>” is recorded. |
| RTR ID (in the Account section; owner, November 16, 2026, [D-2026-11-16-04](../../../../mvp/decisions.md#d-2026-11-16-04)) | **Registration place** (the founding-city list, shown as “Cebu City · PH-CEB”) and **Registration date** (a date field, not after today; “Enter the registration date.”). The **RTR ID** under them is a live preview that follows both and keeps its number at the end; it is never typed. Hint: “The RTR ID follows the registration place and date, and keeps its number at the end. It isn't typed by hand.” If another player already has the resulting ID: “Another player already has this RTR ID. Choose another place or date.” |
| Read-only | Created by (club or Admin; each club and its name for the person when more than one club saved an unclaimed player), Account (Registered <date> / Unclaimed), Rank, Recent matches. Note: “These stay read-only. Rank, level and match history come from finished club sessions, and Admin can't change ranks, winners or scores. A profile becomes registered only when the player claims it.” |
| Reason for the change | Required whenever something changed (“Say why you are making this change.”), up to 300 characters. |

**Save changes** (replaces Review changes) validates every field in place, focuses the first error, saves, writes **one** Activity entry (“Edited <name>: <changed fields>. Reason: …”), closes the panel and toasts “Saved <name>: <changed fields>.” (plus “Give the new password to the player yourself.” when a password was set). Nothing changed: “Nothing changed.”. Offline: the existing offline error, nothing saved.

**Changing the RTR ID asks first** (November 16, 2026, [D-2026-11-16-04](../../../../mvp/decisions.md#d-2026-11-16-04)): when the place or date changed, Save changes opens the confirmation **Change RTR ID?** over the panel: the Current → New pair, “The old RTR ID is replaced with the new one on every record that holds it, in every club that saved <name>.” and, smaller, “QR codes and links the player already shared with the old RTR ID may stop working.” Buttons **Back** (returns to the panel with everything typed kept) and **Change RTR ID**. The Activity entry adds “RTR ID <old> replaced with <new> on every record.” Whether an old RTR ID still leads to the player is open in the decision.

Decided (owner, 2026-11-10): the password field is confirmed over [D-2026-11-07-01](../../../../mvp/decisions.md#d-2026-11-07-01), for MVP or beta only; no end date is set, so the label stays “Password *(for MVP or beta only)*”. A direct phone or email edit marks the open contact-change request for that field “Superseded by an Admin edit” (stored as rejected plus `supersededAt`), logs it in the Activity log, and it can no longer be approved or applied (Option A).

## A-CONTACT-REQUESTS — Review list

Rows: player/ID, requested field, request time, review/application status, and next permitted action. Proposed filters mirror actual Pending, Approved/applying, Applied, and Failed/needs-attention states. Pulling the list down from its top (touch), or coming back to the tab, refreshes it once every 10 seconds with the session page's `pull-to-refresh` pill ([November 12, 2026 mockup change](../../../../mockup-changes/2026-11-12-admin-pull-to-refresh.md)); the same applies to Club names and Password resets. Rejected/not-approved representation awaits final policy but must not appear Applied.

Open review against the correct permanent ID, not a name-only match. Repeated requests for the same field need defined conflict behavior; flag them instead of processing stale values blindly.

The Players list/grid, Quick view and full profile resolve the saved profile picture, including character choices, using the global player identity. Missing or failed pictures show initials. Returning to the tab refreshes the directory and player detail so avatar changes from Player Information can appear (#577).

**Full-photo viewer (November 11, 2026, [D-2026-11-11-11](../../../../mvp/decisions.md#d-2026-11-11-11); mockup log 2026-11-11-admin-avatar-photo-viewer).** An avatar that shows a real picture (an uploaded photo or a chosen character) opens a full-photo dialog: black backdrop, the photo centred, **×** top right; it closes on a click anywhere on the overlay, **×** or Esc (Esc closes only the dialog, not a Quick view behind it). It opens from the big photo in the Players **Quick view** (the row itself still opens Quick view), the big photo in **Edit profile** ([A-PLAYER-EDIT](#a-player-edit--edit-a-player-everything-the-player-can-change)), the **Player detail** hero ([A-PLAYER-DETAIL](#a-player-detail--internal-identity-view)) and the player card in the **contact-change review** ([A-CONTACT-REVIEW](#a-contact-review--approve-and-apply)). Initials never open it. Accessible names: “View full photo of <name>”, “Photo of <name>”, “Close” (the ×, owner decision November 12, 2026); overlay tokens `--photo-scrim` and `--photo-fg` ([D-PHOTO-VIEWER](../../dialogs.md#d-photo-viewer--full-photo)); focus returns to the avatar that opened it. The Admin club detail logo follows the same rule when a club has a picture (the fixtures have only initials, so nothing opens today). It is the same dialog as in the Player app.

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
