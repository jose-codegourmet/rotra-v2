# Private session results, publishing, exports, and history

**Last verified:** 2026-11-18 for scoring modes in the session record ([D-2026-11-18-04](../../../../mvp/decisions/2026-11-18.md#d-2026-11-18-04); [log](../../../../mockup-changes/2026-11-18-queue-scoring-modes.md); mockup only). 2026-10-28 for settled documentation reconciliation.

**Surfaces:** `Q-RESULTS`, `Q-STANDINGS-SLIDE`, `Q-AWARDS-SLIDE`, `Q-OFF-DAY-SLIDE`, `Q-PUBLISH`, `Q-EXPORT`, `Q-HISTORY`.

**Source:** [session result rules](../../../../business_logic/product/queue/modules/results/README.md). **Reference:** [ROTRA Queue prototype](../../../../../apps/mockup/queue-app/rotra-queue.html).

## Q-RESULTS — Private result review

**Entry:** after Session done, or **Result slides** from a valid session record.

Header: “Session results · private”, title, “date · venue · N games”. Actions: **Match history** (session record), **View public page**, **Download images**, and primary **Publish results** — or **Update publication** once published.

Status chips: **✓ Player records and ranks updated**; **Club results private** / **Club results published**; **Off Day private** / **Off Day shared**. Copy: “Player profiles and ranks updated when the session finished. Publishing is separate and only affects the session page. Results are read-only.”

Slide tabs: **1. Standings**, **2. Awards**, **3. Off Day**.

Every slide frame: club logo/initials and name, slide title, “session title · date”, the content, and a footer with the venue and **powered by rotra**.

Results are read-only. No manual MVP selection or Off Day editing.

## Q-STANDINGS-SLIDE — Slide 1

Table: #, Player, W, L, G — players with at least one counted game, ordered by most wins, then fewest losses. Players with the same wins and losses share a position (1, 1, 2 since November 19, 2026; was 1, 1, 3); the slide keeps one row per player with the shared number ([D-2026-11-18-05](../../../../mvp/decisions/2026-11-18.md#d-2026-11-18-05); mockup only). Guests included; fun games count; partial and invalid games don't. Empty: “No counted games were recorded in this session.”

## Q-AWARDS-SLIDE — Slide 2

- **MVP:** name and “Won more than expected for their level, partners and opponents.” or “Not enough counted games to name an MVP.”
- **Most Improved:** name and “Played above their last N sessions at this club.” or “Not enough recent club-session history.”
- Footnote while the formula is unsettled: “Prototype formula. ROTRA hasn't settled the award maths yet.”
- **Faces and Share** (owner, November 13, 2026; [log](../../../../mockup-changes/2026-11-13-queue-awards-faces-share.md)): each award card shows the winner's picture left of the label and name (60 px; MVP 68 px with an accent ring; Off Day rows 44 px). On the public page the name and picture follow the page's masking rule (private players and guests masked) and a signed-in player can tap the face for the profile card. MVP and Most Improved each have a **Share** button (accessible name “Share AWARD: NAME”) that opens the share dialog titled “Share MVP” / “Share Most Improved” with Story, Facebook post and Square images: the winner's picture and name, the club, the session title, the award name big in the accent, its reason line and the date; then OR and the Session link. Off Day stays private and has no Share.

## Q-OFF-DAY-SLIDE — Slide 3

Private band at the top: **🔒 Private · not included in sharing** (omitted when shown publicly after explicit inclusion). Each listed player: name and “Below their usual results across their last N club sessions.” Empty: “No one had an off day by the recent-history measure.” Footnote: “Only players with 5+ sessions here in the last 3 months are compared.”

Off Day never appears on the public page, a profile, an export, or a thumbnail without explicit inclusion. Never list the weakest player just to fill it.

## Q-PUBLISH — Publish results

Sheet **Publish results**, online only (“Publishing needs internet.” offline). “Audience: **anyone with the session link**.”

| Choice | Default |
|---|---|
| Standings — “N players” | Checked first time; previous selection when updating |
| Awards — “MVP and Most Improved” | Checked first time; previous selection when updating |
| **Include Off Day** — warning border; “Shows NAMES publicly.” or “Empty for this session.” · “Off by default.” | **Always unchecked** when the sheet opens |

Copy: “Player ranks already updated; publishing doesn't change them.” Actions **Back to private review** and **Publish selected results** (needs at least one choice and a connection). Toast: “Results published to the session page”.

Re-publishing replaces the published selection. Full withdrawal is not specified.

**Save to Photos (owner, November 15, 2026; [log](../../../mockup-changes/2026-11-15-share-save-to-photos.md)).** In **Share leaderboard** and **Share your finish**, on iPhone and iPad where the system share sheet takes files, **Download N images** becomes **Save to Photos** (it opens the share sheet; its **Save Image** puts the PNGs in Photos) with the hint “Save to Photos opens the share menu. Tap **Save Image** there.” The full-screen view's button reads **Save to Photos**. Android and computers keep **Download**. **Download images** (Q-EXPORT) is unchanged.

## Q-EXPORT — Download images

Sheet **Download images**:

- Format: **Story · tall** (default) or **Feed post · 4:5**.
- Checkboxes: Standings, Awards (both on), **Include Off Day** (off, warning border).
- “N images. Long standings continue onto extra images so every name stays readable.” Standings split at **14 rows per Story image, 10 per Feed image** (“Standings 1”, “Standings 2”, …).
- Preview frames: club name, slide title, rows, footer “powered by rotra”.
- Primary **Download N images**.

Images are files for the operator to share through Instagram/Facebook. No automatic posting or social login. Retrying a download never re-finalizes the session. (Downloading is turned off in the prototype.)

## Q-HISTORY — Session record

**Entry:** a past session in home or the calendar, or **Match history** from results. Back link **Home**.

Header: “Session record · read-only”, title, date · time · venue. Chips: **Completed** with **Results published** / **Results private**, or **Invalid session** (cancelled sessions: see below). Totals: Games (with “N invalid” when any), Players, Courts, Length. The Details show **Scoring**, the session's mode (November 18, 2026; a session saved before scoring modes reads as 16/31). Each match in the record shows its score as in [Q-MATCH-RECORD](match-control.md#q-match-record--read-only-outcome), with every game score of a best of 3.

Below the totals, tabs: **Public page**, **Results** (default, “N games”), **How the night ran**, **Players** (“N”), **Financials**.

| Tab | Contents |
|---|---|
| Public page | What anyone with the link sees: Details (when, venue, courts, formats, mode, minimum), what results are on the page (shared slides, Off Day shared/private, publish time) or “Not shared yet”, and the participants grid. **Open public page**; **Publish results** / **Update publication** for valid sessions |
| Results | Standings table (rank, player, W, L, games) with **Share leaderboard**, **Result slides** and **Download images**. **Share leaderboard** (owner, November 13, 2026; [log](../../../../mockup-changes/2026-11-13-share-leaderboard.md)) opens a wide dialog: a size switch (Story, Facebook post, Square); the standings split into several images (10 places per story, 8 per post, 6 per square), each showing “Leaderboard”, the session title, date and club, then rank, picture, name (long names end in an ellipsis) and a compact record per row, W in green, L in red, G in the text colour (top three ranks in the accent), and “#a–b of N” by the ROTRA mark; every image starts picked, a tap picks or unpicks it (“N of M images picked · Pick all / Clear”); **Download N images** and **Share** (disabled with none picked); a big **OR**; the **Session link** field with the copy icon. Names in the images follow the public rule: registered players in full, private players and guests masked. From the session page, a signed-in player's own row is highlighted in the images (accent row, “YOU” tag), the image they're on is captioned “You're here”, and the dialog opens on it. Invalid sessions show only the no-official-result notice |
| How the night ran | The replay card, then one column per court listing every match in play order per [Q-MATCH-RECORD](match-control.md#q-match-record--read-only-outcome), each drawn as the same small court as the finished session page's Match history (owner, November 15, 2026; [log](../../../../mockup-changes/2026-11-15-queue-record-courts.md)): “#N · start–end” (· Fun) as the corner pill, Team A on the left, faces with first names on dark pills, the winning pair ringed, the score (or “No score”) and “◀ Won” / “Won ▶” on the net, Invalid on a desaturated court; substitution lines under the court. Invalid sessions: “This session has no official result, so there is no match history or replay.” |
| Players | A card per roster player, most games first: picture, name, level, rank chip, **games against the minimum**, W–L, and **Above minimum** / **Met minimum** / **N short**. Header: “Minimum N games · M below it”. Invalid sessions show “Not counted” |
| Financials | The saved cost estimate: court cost with the calculation, shuttle lines, entrance fees (₱fee × players · misc) when set, total, break-even per player, what players paid (custom amount or break-even), and expected collection with profit / loss / breaks even. “No cost estimate was saved for this session.” when none. Includes the manual paid / not-paid checklist; ROTRA does not collect money. Payment updates never edit permanent match results |

**Replaced November 20, 2026 ([D-2026-11-20-01](../../../../mvp/decisions/2026-11-20.md#d-2026-11-20-01); [log](../../../../mockup-changes/2026-11-20-queue-record-games-not-ranked.md); mockup only):** with Record games off the games are recorded as usual; only their wins stay out of the leaderboards and win rate. The session record works as for a recorded session (standings, How the night ran, W–L, Publish results), with a **Not ranked** chip and a notice above the standings. The November 18 text below is what the mock app still runs.

**Record games off (owner, November 18, 2026; [D-2026-11-18-06](../../../../mvp/decisions/2026-11-18.md#d-2026-11-18-06); [log](../../../../mockup-changes/2026-11-18-queue-record-games-option.md); mock app).** Instead of **Results published** / **Results private** the header chip is a warn **Not recorded**. Games still shows the number of finished matches. The tabs stay:

- **Public page:** the same Details and participants; **Open public page** only, no **Publish results** / **Update publication**.
- **Results:** only the notice “This session's games were not recorded. It has no results, standings, result slides or awards, and it doesn't count toward player records or rankings.” No Share leaderboard, Result slides or Download images.
- **How the night ran:** the same notice followed by “There is no match history or replay.”
- **Players:** each card shows games against the minimum and the minimum chip (**Above minimum** / **Met minimum** / **N short**), with no rank chip and no W–L. The header line “Minimum N games · M below it” stays.
- **Financials:** unchanged.

Open: whether the session shows in the club's records and on a player's own session list (mockup: in the club's records, marked Not recorded; the Player app is unchanged), and what finishing it writes to the database ([D-2026-11-18-06](../../../../mvp/decisions/2026-11-18.md#d-2026-11-18-06)). The Result slides route, if opened by address, has nothing to show for this session.

**Replay (How the night ran tab).** A card showing every court as it looked at one moment: each busy court drawn with its players stacked on each side of the net (tap a player for their profile) and “#match · N min”, free courts greyed. Under it a play/pause button, the current time, a timeline slider from the first match start to the last match end, and the end time; a summary reads “7:55 PM · 2 games on court · 7 finished so far”. Dragging the slider moves through the night; **Play** advances one session minute every 120 ms (a three-hour night in about 20 seconds) and stops at the end. Matches on court at that moment are highlighted in the court columns below. The slider has an accessible name and reports the time as its value.

**Cancelled session record** (owner decision, November 6, 2026). A cancelled session opens a simpler record, with no tabs. Header as above; chip **Cancelled** and “Cancelled WHEN” with its day (“Cancelled yesterday 9:00 PM”, “Cancelled Mon, Nov 2 · 6:00 PM”). Notice: “**Reason: REASON**” (or “**No reason given.**”) then “This session was cancelled before it started. It has no games, standings or result slides, and it doesn't count toward player records or rankings.”, adding “N players were marked paid; refunds happen outside ROTRA.” when any were. Totals: **Joined** (“of N slots”), **Waitlist**, **Marked paid**, **Courts**. **Open public page**. **Roster · N**: a card per player with picture, name, level and “Paid ₱AMOUNT” or “Not paid” (read-only); empty “Nobody had joined.” **Waitlist · N**, a numbered list, only when anyone is on it. Opening a cancelled session's preparation URL shows this record instead.

Payment tracking lives in the **Financials** tab: below the estimate, the [payments checklist](financials-inventory.md#q-payments--payments-checklist) shows who has paid, collected, still due and collected against costs. Contact details are not shown there.

## Acceptance examples

- Declining to publish does not stop global rank updates.
- Exporting slides 1 and 2 never includes an Off Day frame.
- Opening Publish after sharing Off Day once still starts with Off Day unchecked.
- A 30-player standings export as Story produces three standings images.
- A guest can win MVP but still has no global profile link.
- No five-session baseline means no fabricated Most Improved/Off Day award.
