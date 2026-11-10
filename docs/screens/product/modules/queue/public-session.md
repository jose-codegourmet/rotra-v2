# Public session page

**Last verified:** 2026-11-10 for the real-mode signed-in join (#687). 2026-11-09 for the signed-in Player experience (D-2026-11-09-02 to 05, 06, 08; in the mock app, Q17). Earlier: the operator-only preview route (#469), masked participant names (#475) and the aggregate skill mix (#474).

**Surfaces:** `Q-PUBLIC-DETAILS`, `Q-PUBLIC-PARTICIPANTS`, `Q-PUBLIC-RESULTS`, `Q-PUBLIC-STALE`, `Q-PUBLIC-JOIN`.

**Audience:** anyone with the link; no sign-in required. A signed-in ROTRA Player sees more (full names of registered players, the full roster, Courts now and the Queue) and, when confirmed in the session, the **My night** card; see [Signed-in Player](#signed-in-player-november-9-2026). **Sources:** [Queue page brief](../../../../business_logic/product/queue/README.md), [license retention](../../../../business_logic/product/admin/modules/clubs-licenses/README.md). **Reference:** [ROTRA Queue prototype](../../../../../apps/mockup/queue-app/rotra-queue.html) — **Public page** / **Preview public page**.

## Shared composition

No operator top bar. **Account bar** (owner request, November 10, 2026; [log](../../../../mockup-changes/2026-11-10-queue-public-account-bar.md)): a slim sticky bar at the top with **ROTRA** on the left and, on the right, the theme toggle and the visitor's ROTRA Player sign-in. Signed out (a visitor, or a guest who sent a request): a **Log in** button (accessible name “Log in with ROTRA Player”), the same login that returns here. Signed in: the Player's picture and first name (or nickname) with a chevron, a 44 px pill that opens a menu: a header with their picture, full name and RTR ID; then icon rows **My ROTRA profile** (opens ROTRA Player in a new tab) and **Sign out** (error colour; toast “Signed out”; the page goes back to the visitor view). The operator preview shows the visitor's bar. Hero: “Date · start–end”, session title, club logo/initials and name labeled **Organizer**, and a chip **Happening now** (active), **Finished** (finalized) or **Cancelled** (cancelled). Tabs: **Details** and **Participants · N**.

The operator reaches it from preparation (the **Open public page** icon button next to the session title), the console, and the session record. In the operator app a banner reads “Public page preview. What anyone with the session link sees, no sign-in needed.” with **Back to Queue app**, and a second line “Share this link, not this page's address:” with the session link (origin + `/s/<slug>`) and **Copy link** (toast “Session link copied”; if the clipboard is unavailable the link is shown in an error toast). The real public page has no banner.

**Two addresses.** The session link `/s/<slug>` is the only address to share; it is what Copy link, Copy invite link and the Session QR hold. The preview `/sessions/<sessionId>/public-page` is operator-only: only a signed-in account of the club that owns the session sees the preview. Anyone else who opens it (signed out, private window, another club) is redirected to `/s/<slug>` and gets the visitor page with its normal join state and visibility rules (an unavailable page stays unavailable); an unknown session id is not found.

Do not copy the reference's ads, Can't go, Matches, Chat, or multiple-organizer controls. **Request to join** is now in scope as a request only (Q-PUBLIC-JOIN). A contact route can be added only when the club-contact presentation is decided.

## Q-PUBLIC-JOIN — Guest join request

Shown under the hero on prepared and live sessions. Card **Want to play?** (stacked layout, owner request, November 8, 2026): the title with the slot status on its right (a large accent number and “slot left” for one available slot or “slots left” for more, or “All slots taken” in the warning color; during an active session “Additional players can be admitted”), the **Skill mix** bar (see below; shown whenever anyone is confirmed, replacing the earlier slots-taken bar), one muted line (“Send a quick request and the Queue Master confirms it.”, with “Confirmed guests join the waitlist.” in front when all slots are taken, or “The Queue Master can admit additional players.” during play) and a full-width **Request to join** button at least 44 px tall. When the club turned requests off: “This session isn't taking requests online. Contact the Queue Master to play.”

Sheet **Request to join**: session line (title · date, time · venue); three choices ([D-2026-11-09-06](../../../../mvp/decisions.md#d-2026-11-09-06), replacing the two of #476): **Continue as guest** (selected; the form below), **Log in with ROTRA Player** (the player app login, which returns here with `?join=1`) and **Register with ROTRA** (the registration form under the session's club, which returns here signed in with the request ready to send). Log in and Register show one line (“Log in with ROTRA Player and you come back here signed in, with your request ready to send.” / “Register with ROTRA under CLUB and you come back here signed in, with your request ready to send.”), the note “Logging in or registering never gives a slot. The Queue Master confirms every request.” and a primary button named like the choice. The earlier hint “New to ROTRA? Ask your club for a registration invite…” is gone. Back from the login the sheet opens with “You're back — finish your request below.” and restores the unsent form and retry ID for up to 30 minutes in the same browser tab. The guest form still sends; Player authentication is separate from request ownership and never confirms a slot. Logging in never grants a slot. **Your name** (required, “Enter your name.”); **Nickname (optional)**; **Phone (optional)** with “Helps the club recognise you and link your ROTRA profile. Only the club sees it.” (“Enter a full mobile number, or leave it empty.”); **Your level**: Beginner / Intermediate / Advanced / Not sure (“Pick your level, or Not sure.”; hint “Your best guess. The Queue Master sets your level for the night.”); note “This is a request, not a booking. The Queue Master confirms each guest before giving a slot.” **Cancel** / **Send request** (toast “Request sent”).

Afterwards the same visitor sees a status card instead: **Request sent** (“…Your slot isn't held until they do.”), **Confirmed · you have a slot**, **Confirmed · waitlist #N**, or **Request not accepted**. In the prototype, **Open as a guest** (preparation, Prototype panel) shows this view with the banner “Guest view (prototype)…”.

**Cancelled session** (owner decision, November 6, 2026): in place of the join card, a warning notice “**This session is cancelled.** REASON.” (the reason without its trailing period, then one period; just the first sentence when no reason was given). No **Request to join** and no status card. Details and Participants (with the waitlist) stay visible.

## Q-PUBLIC-DETAILS — Session description

| Row | Content |
|---|---|
| When | Date, start–end, duration |
| Venue | Venue name and address |
| Courts | Count and labels |
| Formats | “Doubles”, “Singles + Doubles”, or “No standard format” |
| Mode | Name and description (“Fair · Mainly level-matched games, roughly 10% easy games.”) |
| Minimum | “N games per player” |
| Payment | “₱X per player · paid at the venue” (the session's payment per player: custom amount, or break-even); “Free” when the amount is 0; the row is omitted when no estimate is saved. Added November 9, 2026 on the owner's request |

Then the notes, and a footer: “Slots are confirmed with the Queue Master directly. Last updated HH:MM.” — adding “Recent changes from the venue haven't synced yet.” when the server knows changes are pending.

Only the payment per player is shown; no cost lines, break-even math or payment states. The club founding location never replaces the venue. Values change only after sync, never from a disconnected operator's local edits. Do not call stale data “Live.”

## Q-PUBLIC-PARTICIPANTS — Confirmed people

A plain grid of tiles with no card borders (owner request, November 8, 2026), **three tiles per row** on a phone (640 px and narrower) and **four** on wider screens, with generous gaps (28 px between rows, 18 px between columns), the masked name at 17 px (130% of the earlier 13 px). **Open slots** (owner request, November 8, 2026): until the session is finished, every unfilled slot shows as a placeholder tile after the participants, a dashed grey ring with a muted “Open”, so 3 confirmed of 12 slots shows 3 players and 9 open tiles; they follow the same three-row cap. **Capped at three rows** (9 players on a phone, 12 on wider screens): when more people are confirmed, the last row fades out under a gradient into the page background with a call to action: a muted “N players are in” line and a large pill button with a lock icon, **Join to see the full roster** (opens Request to join; the note “Full roster is for confirmed participants.” makes the gate explicit). When requests are off or the session has finished, show only “Full roster is for confirmed participants.”; no Request to join button. The Participants tab, including finished sessions, is uncapped only for a server-verified confirmed Player; the operator's own record roster remains uncapped; each tile stacked and centered: profile picture (registered or unclaimed players with an uploaded picture) or initials, masked name, and no level text: the level shows as a 5 px ring around the picture, with a 4 px gap between ring and picture (the picture is 80% of the tile, up to 77 px) in the skill group's color, blue for Beginner, yellow for Intermediate, red for Advanced, neutral grey when they have no level; hovering a picture shows the level (“Beginner Mid”). The “Has a ROTRA profile” label is no longer shown (owner request, November 8, 2026).

**Masked names** (owner decision, November 7, 2026; #475; narrowed by [D-2026-11-09-02](../../../../mvp/decisions.md#d-2026-11-09-02)): for a visitor, each word of the name shows as its first letter plus a fixed `***` (“Jose Adrian” → “J*** A***”, “Mika” → “M***”; a blank name reads “Player”). The server masks them, so the full name is not in the page data, avatar label or tooltips. For a signed-in ROTRA Player, registered players show their full name with the nickname under it (small, muted); guests and unclaimed profiles stay masked. The three-row cap is removed for every signed-in Player (confirmed or not), on the Participants grid and the waitlist alike. For a signed-in Player, each registered player's tile (Participants and Waitlist) is a link to that player's ROTRA profile (the Player app's `/find/<RTR>` route, new tab); hovering rings the picture in the accent and underlines the name. Guest and unclaimed tiles stay plain (owner request, November 9, 2026). The viewer's own tile (Participants or Waitlist) carries a **You** pill under the name, accent fill with on-accent text, and its picture ring turns accent (owner request, November 9, 2026). The operator preview and the record's **Public page** tab show the same masked names. A visitor's own request status card may still show the name they typed. See [Players › Public participant names](../../../../business_logic/product/queue/modules/players/README.md#public-participant-names).

**Skill mix** (#474): inside the **Want to play?** card under the slot status (owner request, November 8, 2026; no longer above the grid), when anyone is confirmed, a `SkillDistributionBar` labeled “Skill mix” (no player total), one compact bar with a segment per group, ordered left to right Beginner, Intermediate, Advanced, then No level, and a hover tooltip with its count, in the same non-green palette as the roster (zero groups are left out). Its accessibility label reads “Skill mix: 4 Advanced, 8 Intermediate, …”. Counts only, computed on the server over the same confirmed participants as the grid (not the waitlist): never who is which level. The grid keeps roster order and is never grouped or sorted by level. Hidden when nobody is confirmed. See [Players › Public skill mix](../../../../business_logic/product/queue/modules/players/README.md#public-skill-mix).

No phone, email, identity-verification state, presence, games, operator notes, or Off Day. The only level shown is the ring color (and its hover text) described above. Below the grid, when anyone is waiting: “Waitlist · N” as a second grid of the same tiles (owner comment, November 8, 2026: the old plain text list read as not shown), each picture slightly dimmed with its queue number (1, 2, …) in a small badge on the picture, ring color by level like the main grid, masked names only, in waitlist order, not capped, and “Waitlisted players get a slot if one opens. Ask the Queue Master.” Empty: “Players have not been added yet.”

## Q-PUBLIC-RESULTS — Published results only

For finished sessions, a **Results** section below the tabs shows the published Standings and/or Awards slides, and Off Day only if explicitly included (without its private band). Before publication: “Results for this session have not been shared.” — never claim there were no games.

Before publication, private result data must not be in hidden panels or preloaded payloads. Invalid sessions have no results section.

## Q-PUBLIC-STALE — Expired license and deleted page

On club expiry the page becomes stale; the exact remaining read access is an open business detail. Distinguish stale from deleted.

After six months of continuous expiry the page is deleted. Show a neutral unavailable state without leaking retained internal data. Player match history and earned ranks remain in Player Information. Renewal within the retention period cancels deletion.

## Offline public visitor

A previously cached copy may show with its last-update time. With no cache, explain that a connection is needed.

A signed-in Player's My night keeps showing its last-loaded data offline. Offline, I'm leaving, I can't make it, Cancel match request, Request a match and Invite are disabled (“You're offline. Reconnect and try again.”); only **I'm here** works and queues (“Checked in · the QM will see it when their device syncs”). Decided by the owner 2026-11-10.

## Acceptance examples

- A public visitor sees Details/Participants without signing in and can use Request to join when requests are enabled. A request never reserves a slot; only the Queue Master confirms or declines it.
- A cancelled session's page says Cancelled with the reason and offers no Request to join.
- A confirmed guest has no broken fake profile link.
- Private Off Day never appears in public data or image previews.
- The session's cost estimate never appears publicly; only the resulting payment per player does (Details › Payment).
- Deleting the page does not remove a player's profile/history.


## Signed-in Player (November 9, 2026)

Decisions [D-2026-11-09-02](../../../../mvp/decisions.md#d-2026-11-09-02), [-03](../../../../mvp/decisions.md#d-2026-11-09-03), [-04](../../../../mvp/decisions.md#d-2026-11-09-04), [-05](../../../../mvp/decisions.md#d-2026-11-09-05) and [-08](../../../../mvp/decisions.md#d-2026-11-09-08). They supersede the #569 rules below that names stay masked for every audience and that only confirmed participants see the full roster.

**Names and roster.** Signed in: registered players show full name + nickname, guests masked, no three-row cap (participants and waitlist). Not signed in: everything masked and capped as today.

**Join.** A signed-in Player not in the session sees the **Want to play?** card with the slot status, skill mix, “One tap sends your request and the Queue Master confirms it.” and a full-width **Request to join as NAME** button (no form). One tap sends; the card becomes **Request sent** (“Thanks, NAME. The Queue Master confirms every request, usually at the venue. Your slot isn't held until they do.”) with **Cancel request**. One open request per account: a second tap is impossible. Waitlisted: **Confirmed · waitlist #N**. Declined: **Request not accepted**.

*Real mode (#687, November 10, 2026):* the Queue app holds no Player session. The page asks the Player app (`player.rotra.club/api/public-sessions/<slug>/access`, credentialed, paired origins only) who is signed in, and **Request to join as NAME** / **Cancel request** are `POST …/join` and `…/cancel` on the same origin. The join card waits for that check, so a signed-in Player never sees the guest card first. A signed-in Player never gets the Request to join sheet (no guest form, no Log in or Register choices); coming back from the login with `?join=1` shows the one-tap card. Full names, the uncapped roster, Courts now and My night are still mock only in real mode.

**Refresh bar** (`/s/<slug>` only, under the hero): “Updated 7:42 PM · Refresh”, adding “· Venue changes haven't synced yet” when the server knows the venue has unsynced changes. **Refresh** is disabled for 10 s after a tap (tooltip/aria “Refresh again in a few seconds”). Only data refreshes, rendered in place; no polling, no Realtime.

**My night card** (confirmed signed-in Player; above the Details / Participants tabs, under the join area; label “My night”):
- Before start: “Confirmed · starts DATE, TIME” and **I can't make it** → drop-out notice, line “Told the QM you can't make it”; the slot stays until the QM removes them.
- Live, not present: one large full-width **I'm here** (≥44 px). After a tap, Present is set and the card shows “Checked in” (or “Checked in · the QM will see it when their device syncs” when offline). After **I'm leaving**: “You've left · tap I'm here if you come back” with **I'm here**.
- **Stats panel** (owner request, November 9, 2026), live and present, at the top of the card: the games played as a big number with “games played · minimum 6”, a progress bar toward the minimum (amber, green once reached) and “N more to reach the minimum” or “Minimum reached” (no bar or minimum when the session has none); beside it **Won** and **Lost** as big-number tiles (green, red). One column at 420 px and narrower.
- Live, present: under the stats panel, “In queue #3 · with A vs B, C”, “Not in a queued match”, or, highlighted (`card hl`), “You're on Court 2 · with A vs B, C”. Buttons **Request a match** and **I'm leaving**. With an open match request: “Match request sent · the QM decides” and **Cancel**.
- Finished: the stats panel without the bar or minimum, “Session finished” and a **Match history** link to Player Information.
- **Invite** (confirmed or waitlisted; only until the session starts, owner request, November 9, 2026: hidden once it is live, finished or cancelled, and when requests are off) opens the Session invite card (below).
- Waitlisted: “Waitlist #N · you get a slot if one opens” and, before the start, **Invite**.
- Guests get no card: today's status card plus “Register to check in and see your matches.”

**Details tab, signed in, live session:** after the session details, **Courts now**: the Queue Master's court cards, read-only (owner request, November 9, 2026): court label and chip (**Playing** with the green glow, **Getting ready**, **Free**; merged courts read “Court 1 + Court 2” with **Merged · Playing** / **Merged · Getting ready** on one tall court), the court drawing with each team's pictures and first names on its side (names per the rule above), and “Started 7:31 PM” or “Waiting to start” under it; an empty court shows the drawing with “Free”. No format label, menu or buttons; no score, no running time. Then the read-only **Queue**: **#1** pinned on its own with a yellow glow and a **Next** chip; **#2 onward** in a box that scrolls vertically (about 380 px tall), its bottom edge fading out until it is scrolled to the end (no fade when it fits). Each queued match is one row: position, Team A's pictures and first names, VS, Team B's; no format label (the faces tell the format) and no status line. On a phone the position sits on the left and the teams stack. Visitors see “Log in with ROTRA Player to see the queue.” as today.

**Own standing only.** No other player's results or positions during the session. Finished and published: the published Standings with the viewer's row highlighted. Unpublished: “Results for this session have not been shared.”

**Request a match** sheet (present, signed-in, confirmed): “Pick who you want to play with, or leave a spot as Anyone. The QM decides.”; a **Format** pill row, always shown, in this order: **2 v 2** (default), **1 v 1**, **1 v 2**, **3 v 3**, **4 v 4**, **5 v 5**; a pill is disabled (greyed, struck through, tooltip “Not allowed for requests in this session”) when the session's **Players can request** setting leaves that format off, with the hint “Greyed formats aren't open for requests in this session.”; with every format off, Request a match toasts “This session isn't taking match requests” (owner request, November 9, 2026); a **court drawing** (the console's court lines) with the viewer on the left side, labelled **You** (accent name pill), the partner spots under them (**Partner**, or **Partner 1…N** for bigger teams), and the opponent spots on the right side (**Opponent**, or **Opponent 1…N**), as many as the format needs (1 v 2: You alone against two; 5 v 5: four partners and five opponents, on a taller court); an empty spot is a dashed “+” face with its label, a picked one shows the player's picture and short name (owner request, November 9, 2026); picked spots also list under the court with **Change** and a clear (×) back to Anyone; a spot opens a picker of present players (player tiles; owner request, November 9, 2026: tabs **All · N**, **Playing · N** (on a court) and **Available · N** (not on a court), a skill filter **All levels / Beginner / Intermediate / Advanced**, and a sort **↓ Longest wait / ↑ Shortest wait / ↑ Fewest games** (default) **/ ↓ Most games**; “Present players only. Players on a court or already in a waiting match can still be picked.”) with **Anyone** / **Back**. Footer **Cancel** / **Send request** (toast “Match request sent”). One open match request per player.

**Session invite** sheet (title “Session invite”): the Session QR share card with its **Post | Story** switch, headline “NAME invites you to play”, the session title, date, time · venue and club, the QR, “Scan to join” (or “Waitlist open” when the session is full) and the link with `?invite=<code>` (one random short code per player and session). Buttons **Close** and **Share** (the phone's share sheet) or, without Web Share, **Download image**.

## Signed-in Player access (#569, owner decision November 8, 2026)

**Queue for any signed-in Player; full roster only for confirmed participants. Preserve individual
level rings.** The earlier #569 acceptance about hiding individual levels is superseded. Names remain
masked for every audience. **Superseded on November 9, 2026** by [D-2026-11-09-02](../../../../mvp/decisions.md#d-2026-11-09-02) (see above) for names and the roster cap; the Queue section and login round-trip rules below still apply.

In **Details**, after session details, a **Queue** section reuses the existing MatchCard presentation:
“Read-only · Last synced queue”, position, format, masked Team A / Team B and “Waiting in queue” (layout superseded on November 9, 2026: see Details tab above). No
profile buttons, drag handle, origin metadata, presence, Start/Edit/Remove or other operator action.
Empty: “No matches queued yet.” Anonymous: “Log in with ROTRA Player to see the queue.” and the existing
Player login link. A failed access check shows “Couldn't check Player access.” / Retry and hides the
previous private projection. No new public Matches or Chat tab.

**Participants** keeps masked names and level rings. Only server-verified, unreleased roster membership
linked to the authenticated Player removes the three-row cap; the total in the tab/count is the full
count, even when the server sends only 12 tiles. Being registered, pending or waitlisted does not remove
the cap. This applies to finished sessions too. The operator public preview remains the visitor preview.
The existing masked waitlist remains public and separate.

A login link retains only `/s/<slug>`, `tab` and `join`; arbitrary query values/fragments never cross to
Player. Queue-local temporary navigation restores the tab and hash; the request draft stays only in
Queue's sessionStorage and expires after 30 minutes. A registration invitation with a validated `next`
returns after success; an invitation opened later in the same Player tab can use the pending login
return for 30 minutes. Registration never confirms the player or links a club guest.
