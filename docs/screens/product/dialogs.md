# Dialog and confirmation contracts

**Status:** Proposed copy and interaction for agreed irreversible/important actions. Exact visual styling is implementation work. Updated October 26, 2026: copy below matches the [ROTRA Queue prototype](../../../apps/mockup/queue-app/rotra-queue.html), where every dialog is a sheet. Updated November 6, 2026 for the On court step and substitution game credit ([log](../../mockup-changes/2026-11-06-queue-on-court-and-sub-credit.md)). Updated November 11, 2026 ([D-2026-11-11-11](../mvp/decisions.md#d-2026-11-11-11)) for D-OVERFILL, D-COURTS-TIME, D-BAGGING-PAIR, D-PARTICIPANT-PROFILE and D-PHOTO-VIEWER.

Removing a waiting match, a roster player during preparation, a free court, or an inventory item takes effect immediately with a confirming toast and no dialog: none of them records or erases a played game.

Every dialog names the target session/player/match, shows the actual selected values, provides an explicit cancel/back option, prevents duplicate commits, and reports failure without pretending success. Cancel affects only the uncommitted action. Once a permanent decision is saved, closing the dialog does not undo it.

## D-START-SESSION — Start session

Title **Start session?** Show session, court count, formats, mode, minimum, roster “N confirmed · M present”. Copy: **“Every player's level locks now. Players you add later get a level when you add them, and it locks too.”** Offline adds “Starting needs an internet connection.” and Start session is disabled. Primary **Start session**; secondary Back. Eligibility/license/other-active-session checks still apply; a dialog does not bypass them. Started late or on another day than planned (November 6, 2026): first “This session was planned for 6:00–9:00 PM yesterday. Set a new end time to start.” and a required **New end**, pre-filled with now + the planned length rounded up to 15 minutes; Start session is disabled until it is after now ([Q-START](modules/queue/session-setup.md#q-start--start-review)).

## D-DELETE-SESSION — Delete session

Always shown before a delete; it has two forms. Both show session, when, venue, and roster “N confirmed · M on the waitlist · K join requests”.

- **Nobody confirmed:** title **Delete session?** Copy: **“The session, its public link, its waitlist and any join requests are removed. This cannot be undone.”** Primary **Delete session** (danger); secondary **Keep session**. Offline adds “You're offline. Connect to delete this session.” and disables the primary.
- **Players confirmed:** title **Can't delete this session** Copy: **“N players are confirmed for this session. Remove every confirmed player from the roster first, then delete the session.”** Primary **Open roster** (switches to the Roster and levels tab); secondary Back. No delete button.

The save re-checks: if a player was confirmed meanwhile, the error shows in the dialog and nothing is deleted.

## D-DELETE-PLAYER — Delete saved player

Shown only when the player is in the **Active Session** (owner decision, November 8, 2026). Anywhere else **Delete player** acts at once with the toast “NAME deleted”.

- **In the Active Session:** title **Delete NAME?** Copy: **“NAME is in TITLE, which is running now. They'll be marked not present, and N waiting matches with them will need attention.”** (the matches clause only when N > 0) and **“They're also taken out of any prepared or upcoming session. Their finished games and results stay.”** Secondary **Keep player**, primary **Delete player** (danger).
- **On court or playing:** title **Can't delete NAME yet** Copy: **“NAME is on COURT / playing on COURT. Finish or substitute that match first, then delete them.”** Only **Back**.

The save re-checks: if they went on court meanwhile, nothing is deleted and the error shows.

## D-CANCEL-SESSION — Cancel session

Owner decision, November 6, 2026 ([log](../../mockup-changes/2026-11-06-queue-example-sessions-and-cancel.md)). Opened by **Cancel session** in a prepared session's Preparation header; never offered once the session has started.

Title **Cancel TITLE?** Lines: “Sat, Nov 7 · 6:00–9:00 PM” (date · time range) and “N players joined · M on the waitlist”. When any roster player is marked paid, a warning: **“P players are marked paid. Refunds happen outside ROTRA.”** (“1 player is marked paid. …”). Field **Reason (optional)**, up to 120 characters. Notice (danger): **“This can't be undone. To play anyway, create a new session.”** Secondary **Keep session** (focused first); primary **Cancel session** (danger).

On confirm the session becomes Cancelled with the cancelled time and the reason (empty reason saves none), pending join requests close, the toast reads **“TITLE cancelled”** and the cancelled [session record](modules/queue/results-sharing.md#q-history--session-record) opens. The save re-checks that the session is still prepared; if it started meanwhile, nothing is cancelled.

## D-START-MATCH — Put on court, then Start match

Two steps since November 6, 2026.

**Put on court.** Title **Put match N on court**. Show teams with levels, format (and Fun game), and free-court buttons — two for 5v5. Primary **Put on court** (disabled until courts are chosen and the match is ready); secondary Back. Recheck player/court availability before accepting. Placing makes the match **On court** (court chip **Getting ready**); it does not start the match or its timer. Courts before their planned start are listed under **Not open yet** with **Start anyway** (“Start anyway opens the court now. The booking time and costs don't change.”); this sheet is the confirmation, so it opens the court and chooses it without a second dialog. With the Auto Queue switch on, ROTRA places matches without this sheet (never 5v5), except on the court a result just freed, which opens the [next-match picker](modules/queue/match-control.md#q-next-match--next-match-picker-after-a-result) (`Q-NEXT-MATCH`, a non-destructive choice sheet: **Pick this** or **Skip for now**, no confirmation step).

**Start match.** One tap on the Getting ready court card or in Q-ON-COURT, with no dialog: the court is already chosen. ROTRA rechecks presence and busy players; on a problem, toast “Something changed. Review the match again.” Success: “Match N started on Court X”. It is always an explicit operator action, never automatic, in Manual Queue and Auto Queue alike.

## D-OPEN-EARLY — Open a court early

Title **Open LABEL now?** (or **Open all courts now?**, listing each court with “booked from HH:MM”). Copy: **“It's booked from HH:MM.”** · **“Opening early makes it available for matches and Auto Queue now.”** · note **“The booking time and costs don't change.”** Primary **Open now**; secondary **Cancel**. The save rechecks that the court is still not open; **Undo early open** in the court's ⋯ menu reverses it without a dialog while the court is free.

## D-COURTS-TIME — Courts and time

Owner comment, November 11, 2026 ([log](../mockup-changes/2026-11-11-queue-courts-and-time-sheet.md); screen [Q-SESSION-ADJUST](modules/queue/session-console.md#q-session-adjust--courts-and-time)). Sheet **Courts and time**, opened from the live console's **Courts and time** button, the session settings and the overdue banner's **Set end time**. It lists **Courts · N** as one row per court: label, a **Playing** / **Getting ready** / **Free** chip, the booking line (“Until 10:51 PM”, “Opened early …”, “Booking ended” in the warning colour) and **Change time**, which opens the court sheet (Q-ADD-COURT in edit mode). While a match is on the court, the start stays fixed (“Start is fixed after use.”) and the end and label can change; the match is not touched. Note: **“Changing a court's time while a match is on it doesn't touch the match. Occupied courts can't be removed. Changing mode, formats or the minimum during play hasn't been decided.”** **Add a court…** and the session-end controls are unchanged.

## D-WINNER — Permanent winner

Title **Confirm match result**. Show winner and participant names, both scores if supplied, and court(s). Copy: **“This result cannot be changed after confirmation. The court will become available.”** Adapt plural courts for 5v5.

Primary names the winning team; secondary Back to result. Do not use a neutral Save button whose permanence is unclear. After durable success there is no Undo, Change score, Add score later, or Admin correction.

## D-INVALID-MATCH — Permanent invalid game

Title **Mark match invalid?** Show game/participants. Copy: **“No game, win, loss, or minimum-game credit will be recorded. This decision cannot be changed.”** Primary **Confirm invalid match**; secondary Keep playing. Successful durable confirmation frees court(s).

## D-SUBSTITUTE — Partial-game consequences

Title **Confirm substitution**. Show Out, In (with level), Team, and the **Who gets this game?** choice: **Nobody** (default) · **NAME (coming in)** · **NAME (going off)**, never both. With Nobody, copy: **“Neither player's partial game will count toward their minimum or long-term performance.”** With a person chosen, the copy says that person gets this game's count, minimum credit and win or loss for tonight, and that neither partial game counts toward long-term performance. Primary **Confirm substitution**; secondary Back. (With Nobody, partial players also get no session W/L or award credit; the match sheet notes “Neither gets credit for this game.” With a choice it notes “Kiko replaced Jom · Kiko got the game (QM choice)”.) Only for a Playing match; a replacement while On court is a lineup change with no dialog question.

## D-REGENERATE — Rebuild waiting queue

Title **Regenerate waiting queue?** Show counts: “Automatic waiting matches — N rebuilt”, “Healthy manual matches — N kept”, “Manual matches needing attention — N rebuilt”, “Games in play — N untouched” (On court matches are counted here too; Regenerate never changes them). Primary **Regenerate waiting queue** (disabled when nothing would be rebuilt); secondary **Keep current queue**. Failure leaves the previous durable queue intact.

## D-SET-GAMES — Set games played

Title **Set games played** (#717, owner decisions November 11, 2026). Opened from the Players tab by **Set games for all…** (header) or a card's **Set games played…**. Step 1: for one player the rows “Player — NAME” and “Games played now — N”, for all “Players — N on the roster”; a − N + stepper **Games played** (0–99; prefilled with the player's current count, or the roster's median count for all); copy **“Auto Queue, Catch Up and fewest-games sorting use the new count right away.”**; secondary **Back** (closes), primary **Next**. Step 2 (the confirmation): **“NAME's games played changes from 3 to 5.”** for one player, **“Every player on the roster will show N games played.”** for all, with the same copy line; secondary **Back** (to step 1), primary **Set games**. Toast **“Games played set · NAME”** or **“Games played set for 14 players”**; offline, the usual saved-on-this-device suffix. The save stores an adjustment (requested − counted games), so games keep counting up afterwards; a failure shows in the sheet and nothing is claimed as saved.

## D-OVERFILL — Add a player to a full roster

Owner decisions, November 11, 2026 (#735; [log](../mockup-changes/2026-11-11-queue-roster-waitlist-overfill.md)). A confirmation sheet, opened **once** when the roster is full and the Queue Master adds someone: **Add player** and **Add late player** ([Q-ADD-PLAYER](modules/queue/players-roster.md)) or **Give slot anyway** on the waitlist. Title **Add NAME anyway?** Copy: **“The roster is full (24/24). Add NAME anyway?”** and one line about expected games: **“Expected games drop from 4 to 3.”** or, when they do not change, **“Expected games stay at 4.”** (N/CAP are the current count and the slot budget). Buttons: **Cancel** (returns to the Add player sheet with the choice kept), **Add to waitlist** (Add player flows only: puts the player on the waitlist as before) and primary **Add anyway**. After **Add anyway** the roster summary reads 25/24 with the count in the warning colour and “1 over capacity · new players go on the waitlist”. Only the Queue Master can overfill; players never can. **Move to waitlist** (roster row, grid card, Players card) and the player's own **Move me to the waitlist** have no dialog: they act at once with the toast “NAME moved to the waitlist” or “You moved to the waitlist”, and are blocked while the player is in a match (Queue Master toast: “Finish or remove NAME's match first.”; the player's button is not shown while they are in a match; the log's player-side string “You're in a match. Ask the Queue Master to finish or remove it first.” is kept in its copy list but the owner comment of November 11 made the button hidden instead).

## D-CLEAR-QUEUE — Remove every waiting match

Owner request, November 9, 2026. Title **Clear the queue?** Copy: “N waiting matches will be removed from the Main Queue.” · muted “Matches already on a court and finished matches are not affected. You can add or generate matches again afterwards.” Secondary **Keep queue**; destructive **Clear queue** (solid red). Confirming removes every waiting match (manual and automatic), records no game, and toasts “Queue cleared · N waiting matches removed”.

## D-MAKE-MATCH — Confirm a match from picked players

Owner request, November 9, 2026 ([log](../../mockup-changes/2026-11-09-queue-make-match-confirm.md)). Opened by **Make match** in the Players view (Q-POOL), for every format size (1 v 1 to 5 v 5). Title **Make this match?** Copy: “FORMAT · added to the end of the Main Queue. The number on each face is that player's games so far.” A court drawing shows Team A on the left and Team B on the right; each face carries a games-played badge and, under the short name, a small skill-level label (“Beg/Int/Adv Low/Mid/High”, tinted by band; “No level” when unassigned). A line reads “Team A level N · Even (or “D apart”) · Team B level N” (summed assigned levels; an unassigned player counts as 4). Teams start in **pick order** (the first picks fill Team A). Buttons: **Cancel** (closes; the selection stays), **Arrange to balance** (re-splits the same players with the Make match balancing rule and shows “Arranged to balance the teams by level.”), primary **Make match** (adds the shown teams to the end of the queue, clears the selection, toasts “FORMAT added to the queue at #P”).

## D-BAGGING-PAIR — Add bagging pair

Owner comments, November 11, 2026 (#739; [log](../mockup-changes/2026-11-11-queue-bagging-mode.md)). A **wide** sheet from **Add pair** on the Bagging pairs card of the Generate matches workspace (Bagging mode on, doubles). Top: two slots **Selection 1** and **Selection 2**, dashed placeholders (“Tap a player below” / “Then their partner”); once filled they show the player's avatar with the level ring, full name and an ×, and tapping the slot clears it. Then the row **“Games · the ones they play together, or ALL”**: **ALL** and one button **1** to **N** for each game up to the session minimum (accessible names **Game N**); picking every number or none means ALL. Then **“Present players · N”** with **Previous** / **Next** and “Page N of M” when more than 24 are present, and a grid of every present player as a round avatar with a level ring in the Participants grid colours, the **first name only** and no level text (the accessible name still carries the level; helper “Tap two players to make a pair. The ring is tonight's level.”). Tapping a player fills Selection 1, then Selection 2; a third tap swaps the partner; tapping a picked player clears them. A pick who is already paired shows a warning notice “NAME is already paired with NAME. Adding this pair replaces it.” and the primary becomes **Replace pair**. With fewer than two present: “Mark at least two players present first.” Buttons: **Cancel** and primary **Add pair**, disabled until both slots are filled. Toast “Bagging pair added · A and B”; removing a pair from the card toasts “Pair removed · A and B”. Rules: [Queueing › Bagging mode](../business_logic/product/queue/modules/queueing/README.md#bagging-mode-and-bagging-pairs).

## D-MINIMUM — Shortfall acknowledgement

Title **Some players are below the minimum**. Show each name with “g of M”. Copy: “Late arrivals, early leavers and real-world choices happen. You can still finish.” Primary **Continue to finish session**; secondary Back to session. This does not bypass missing-record checks or mark a session invalid by itself.

## D-SESSION-DONE — Whole session

Preceded by a **Session done** review (games recorded, participants, sync, games in play, On court matches never started, unplayed waiting matches, shortfalls). Title **Finish this session?** Show event title/time and “All records on this device are synced.” or “N changes are still syncing.” Copy: “Valid results sync to Player Information automatically, and ranks update. Result slides become available to you privately. Nothing is published until you choose to.” Primary **Confirm Session done**; secondary Back. Disabled while offline, while changes are pending, or while integrity is incomplete.

Games still in play (Playing) block the flow at the review step until finished or invalidated. On court matches that never started are dropped like waiting matches, and the review says “N matches on court weren't started and will be dropped.” Unplayed waiting matches are dropped from results. The longer-term closure policy remains open; this dialog must not secretly finish or invalidate games.

## D-INTERRUPTION — Missing record check

Question **“Was the session interrupted?”** Context explains which records appear missing/inconsistent. Yes begins original-device recovery; No goes to D-INVALID-SESSION. Back leaves the session unresolved. Low minimum counts alone cannot trigger this question.

## D-INVALID-SESSION — No official session outcome

Show the inconsistent session and reason. Copy: **“This session will not count toward player records or rankings. No leaderboard or result slides will be generated.”** Primary **Confirm invalid session**; secondary Back to recovery. Original-device loss has no manual reconstruction option. Whether later recovery can reopen an invalid session remains undecided.

## D-PUBLISH — Public result selection

Title **Publish results**. Show audience “anyone with the session link” and checkboxes Standings, Awards, and **Include Off Day** (unchecked every time the dialog opens). Primary **Publish selected results** (needs one choice and a connection); secondary **Back to private review**. Publishing again replaces the previous selection. Publication failure does not erase previous valid public content or alter ranks.

## D-OFF-DAY — Explicit sharing inclusion

In publication/export review, present a clearly labeled unchecked inclusion control and preview of the Off Day content. Explain that it will be visible in the selected shared output. Inclusion is deliberate; seeing the private slide or pressing ordinary Download does not imply it. A separate modal is not required if the choice/preview is explicit in the parent review.

## D-LICENSE — Manual activation/renewal

Show club, monthly/yearly plan, accepted period, and expected access/retention effect. Primary **Activate license** or **Renew license**. Do not imply automatic collection of money; payment happened outside ROTRA. Recover operation status before repeating after a timeout.

## D-SIGN-OUT — Sign out of the club account

Every **Sign out** (sidebar, home, Club settings → Account, Prototype panel) opens **Sign out?**: “You'll need the club username and password to sign in again.” Adds, when they apply: unsynced changes (“N changes haven't synced yet. They stay on this device and sync after you sign back in here.”), a live session (“TITLE is still live. Signing out doesn't end it; sign back in to continue running it.”), and offline (“You're offline. Signing back in needs an internet connection, so you can't get back in until you reconnect.”). **Stay signed in** has focus; **Sign out** confirms.

## D-CLUB-NAME — Approve club name change

Admin, from club detail. Show the club, its current name, the requested name, and when it was sent. **Approve name change** applies the new name everywhere it appears (dashboard, public pages, future result images); **Reject** closes the request and the club keeps its current name. Permanent RTR IDs and the founding location never change. Recover request status before retrying after a timeout.

The Queue side has no dialog: **Request change** sends the request with a toast, and **Cancel request** withdraws it.

## D-CONTACT — Approve contact change

Show player/RTR ID, changed contact field, proposed value, and review context. Explain unchanged permanent ID/history and that application may take a separate step. Primary **Approve change**; secondary Return to request. A provider failure must remain an application failure, not an Applied success.

## D-CONFIG — Save effective business settings

Show previous/new weights or threshold, validate the complementary total, and explain the actual implemented effective-time/recalculation policy. Primary **Save configuration**; secondary Keep editing. No promise about retroactive reranking until policy is settled.

## D-DISCARD — Unsubmitted form edits

For session/profile/lineup drafts, show **Discard unsaved changes?** only when needed. Discard affects unsubmitted form edits, not durable offline match operations or pending sync records. Never reuse this dialog as permission to clear a device's unsynced session data.

## D-AUTO-TRANSFER — Add selected drafts

Show the selected drafts in selection order before adding to Main Queue. Confirm revalidates lineups and player presence; a conflict leaves drafts available for attention. Repeating the action cannot add the same draft twice. A separate intentional rematch is allowed. Add all is scoped to the current tab.

## D-PARTICIPANT-PROFILE — Participant profile card

Owner decisions and comments, November 11, 2026 (#731, #715, #716; [log](../mockup-changes/2026-11-11-queue-participant-profile-tap.md)). A sheet with no body padding, built as a **profile card**: a banner strip across the top (accent gradient from the existing tokens), the big circular picture overlapping the banner's bottom edge with a surface-coloured ring (it opens the full photo, [D-PHOTO-VIEWER](#d-photo-viewer--full-photo)), the name in bold with the nickname in quotes beside it, a **Registered** chip and a level badge on one row, then a **Tonight ·** status line with a coloured dot (Playing · Court N, On court · getting ready · Court N, Queued · #N, Free, Away; hidden when the player is not on tonight's roster), then boxed sections **About** (Registered in, RTR ID) and **Stats · last 90 days** as four tiles (**Games**, **Wins**, **Losses**, **Win rate**, or “No games yet”). Footer **Close** and **Open ROTRA profile**. Opened from a participant or waitlist tile on the public session page by a signed-in ROTRA player ([public-session.md](modules/queue/public-session.md#q-public-participants--confirmed-people)); the accessible name of the tile is “NAME · view profile”, and the viewer's own tile “NAME (you) · view your profile”.

Variants, by who the player is:
- **Always private:** the picture (real, tap for the full photo) and banner, the masked name, a **Private profile** chip and one boxed section **Private**: **“This player has chosen to keep their ROTRA profile private. You can see their picture and banner; their name, level and games stay between them and the Queue Master.”** No level, status, About or Stats. The player themselves sees their full card.
- **Guest or unclaimed (no ROTRA account):** a **Not on ROTRA yet** chip and a boxed section **Guest**: **“This player is playing as a guest and hasn't registered with ROTRA yet, so there's no profile to show. The club keeps their games for when they do.”**

The **Queue Master's player profile** (opened from court faces, queue faces, the Players tab avatar button, Saved players and the suggestion cards) uses the same banner card with the Queue Master's own content: banner, overlapping photo, name and nickname, the identity chip and a level badge (**Intermediate High tonight** when on the roster, **Intermediate High · suggestion** otherwise, **No level yet**), the identity line, the **Tonight ·** line, then boxed sections **About** (Registered in, RTR ID, Joined) and **In your club** (Added to club, Sessions here, Phone). The guest invite section and the levels note stay below; the footer is unchanged (Back / Close, Delete player, Link to saved player…, Invite).

## D-PHOTO-VIEWER — Full photo

Owner decision, November 11, 2026 (#716; [log](../mockup-changes/2026-11-11-queue-avatar-photo-viewer.md)). Every avatar that shows a real picture (uploaded photo or chosen character, not initials) and is not already a profile button opens a viewer: a black overlay (tokens `--photo-scrim` rgba(0, 0, 0, 0.94) and `--photo-fg` #ffffff for the ×, the same in both themes and all three apps; owner decision, November 12, 2026) with the photo centred, at most 560 px and always inside the screen, and an **×** at the top right. Dialog name **“Photo of NAME”**, close button **Close**; it closes on a tap anywhere on the overlay, the ×, or Esc, and returns to whatever dialog was open under it. Where an avatar already opens a profile (roster faces, match tiles, participant tiles), the photo opens from the big picture inside the profile (accessible name “View full photo of NAME”). Initials do nothing; a picture masked for the viewer shows initials, so there is nothing to enlarge. No visible text. Focus returns to the avatar or photo that opened it; reduced motion drops the fade. Real app: `PhotoViewer` (`@rotra/ui/photo-viewer`) and the Avatar `onView` button.
