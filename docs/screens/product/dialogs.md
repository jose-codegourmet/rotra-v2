# Dialog and confirmation contracts

**Status:** Proposed copy and interaction for agreed irreversible/important actions. Exact visual styling is implementation work. Updated October 26, 2026: copy below matches the [ROTRA Queue prototype](../../../apps/mockup/queue-app/rotra-queue.html), where every dialog is a sheet. Updated November 6, 2026 for the On court step and substitution game credit ([log](../../mockup-changes/2026-11-06-queue-on-court-and-sub-credit.md)).

Removing a waiting match, a roster player during preparation, a free court, or an inventory item takes effect immediately with a confirming toast and no dialog: none of them records or erases a played game.

Every dialog names the target session/player/match, shows the actual selected values, provides an explicit cancel/back option, prevents duplicate commits, and reports failure without pretending success. Cancel affects only the uncommitted action. Once a permanent decision is saved, closing the dialog does not undo it.

## D-START-SESSION — Start session

Title **Start session?** Show session, court count, formats, mode, minimum, roster “N confirmed · M present”. Copy: **“Every player's level locks now. Players you add later get a level when you add them, and it locks too.”** Offline adds “Starting on this device while offline. It syncs when you reconnect.” Primary **Start session**; secondary Back. Eligibility/license/other-active-session checks still apply; a dialog does not bypass them. Started late or on another day than planned (November 6, 2026): first “This session was planned for 6:00–9:00 PM yesterday. Set a new end time to start.” and a required **New end**, pre-filled with now + the planned length rounded up to 15 minutes; Start session is disabled until it is after now ([Q-START](modules/queue/session-setup.md#q-start--start-review)).

> MVP: offline start removed by [D-2026-11-07-03](../../mvp/decisions.md#d-2026-11-07-03); prototype copy update pending a mockup change.

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

## D-WINNER — Permanent winner

Title **Confirm match result**. Show winner and participant names, both scores if supplied, and court(s). Copy: **“This result cannot be changed after confirmation. The court will become available.”** Adapt plural courts for 5v5.

Primary names the winning team; secondary Back to result. Do not use a neutral Save button whose permanence is unclear. After durable success there is no Undo, Change score, Add score later, or Admin correction.

## D-INVALID-MATCH — Permanent invalid game

Title **Mark match invalid?** Show game/participants. Copy: **“No game, win, loss, or minimum-game credit will be recorded. This decision cannot be changed.”** Primary **Confirm invalid match**; secondary Keep playing. Successful durable confirmation frees court(s).

## D-SUBSTITUTE — Partial-game consequences

Title **Confirm substitution**. Show Out, In (with level), Team, and the **Who gets this game?** choice: **Nobody** (default) · **NAME (coming in)** · **NAME (going off)**, never both. With Nobody, copy: **“Neither player's partial game will count toward their minimum or long-term performance.”** With a person chosen, the copy says that person gets this game's count, minimum credit and win or loss for tonight, and that neither partial game counts toward long-term performance. Primary **Confirm substitution**; secondary Back. (With Nobody, partial players also get no session W/L or award credit; the match sheet notes “Neither gets credit for this game.” With a choice it notes “Kiko replaced Jom · Kiko got the game (QM choice)”.) Only for a Playing match; a replacement while On court is a lineup change with no dialog question.

## D-REGENERATE — Rebuild waiting queue

Title **Regenerate waiting queue?** Show counts: “Automatic waiting matches — N rebuilt”, “Healthy manual matches — N kept”, “Manual matches needing attention — N rebuilt”, “Games in play — N untouched” (On court matches are counted here too; Regenerate never changes them). Primary **Regenerate waiting queue** (disabled when nothing would be rebuilt); secondary **Keep current queue**. Failure leaves the previous durable queue intact.

## D-CLEAR-QUEUE — Remove every waiting match

Owner request, November 9, 2026. Title **Clear the queue?** Copy: “N waiting matches will be removed from the Main Queue.” · muted “Matches already on a court and finished matches are not affected. You can add or generate matches again afterwards.” Secondary **Keep queue**; destructive **Clear queue** (solid red). Confirming removes every waiting match (manual and automatic), records no game, and toasts “Queue cleared · N waiting matches removed”.

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
