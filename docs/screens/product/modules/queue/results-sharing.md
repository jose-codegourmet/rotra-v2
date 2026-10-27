# Private session results, publishing, exports, and history

**Surfaces:** `Q-RESULTS`, `Q-STANDINGS-SLIDE`, `Q-AWARDS-SLIDE`, `Q-OFF-DAY-SLIDE`, `Q-PUBLISH`, `Q-EXPORT`, `Q-HISTORY`.

**Source:** [session result rules](../../../../business_logic/product/queue/modules/results/README.md). **Reference:** [ROTRA Queue prototype](../../../../frames/queue-app/rotra-queue.html).

## Q-RESULTS — Private result review

**Entry:** after Session done, or **Result slides** from a valid session record.

Header: “Session results · private”, title, “date · venue · N games”. Actions: **Match history** (session record), **View public page**, **Download images**, and primary **Publish results** — or **Update publication** once published.

Status chips: **✓ Player records and ranks updated**; **Club results private** / **Club results published**; **Off Day private** / **Off Day shared**. Copy: “Player profiles and ranks updated when the session finished. Publishing is separate and only affects the session page. Results are read-only.”

Slide tabs: **1. Standings**, **2. Awards**, **3. Off Day**.

Every slide frame: club logo/initials and name, slide title, “session title · date”, the content, and a footer with the venue and **powered by rotra**.

Results are read-only. No manual MVP selection or Off Day editing.

## Q-STANDINGS-SLIDE — Slide 1

Table: #, Player, W, L, G — players with at least one counted game, ordered by most wins, fewest losses, head-to-head, then name. Unique positions. Guests included; fun games count; partial and invalid games don't. Empty: “No counted games were recorded in this session.”

## Q-AWARDS-SLIDE — Slide 2

- **MVP:** name and “Won more than expected for their level, partners and opponents.” or “Not enough counted games to name an MVP.”
- **Most Improved:** name and “Played above their last N sessions at this club.” or “Not enough recent club-session history.”
- Footnote while the formula is unsettled: “Prototype formula. ROTRA hasn't settled the award maths yet.”

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

Header: “Session record · read-only”, title, date · time · venue. Chips: **Completed** with **Results published** / **Results private**, or **Invalid session**. Totals: Games (with “N invalid” when any), Players, Courts, Length.

Below the totals, tabs: **Public page**, **Results** (default, “N games”), **How the night ran**, **Players** (“N”), **Financials**.

| Tab | Contents |
|---|---|
| Public page | What anyone with the link sees: Details (when, venue, courts, formats, mode, minimum), what results are on the page (shared slides, Off Day shared/private, publish time) or “Not shared yet”, and the participants grid. **Open public page**; **Publish results** / **Update publication** for valid sessions |
| Results | Standings table (rank, player, W, L, games) with **Result slides** and **Download images**. Invalid sessions show only the no-official-result notice |
| How the night ran | The replay card, then one column per court listing every match in play order per [Q-MATCH-RECORD](match-control.md#q-match-record--read-only-outcome). Invalid sessions: “This session has no official result, so there is no match history or replay.” |
| Players | A card per roster player, most games first: picture, name, level, rank chip, **games against the minimum**, W–L, and **Above minimum** / **Met minimum** / **N short**. Header: “Minimum N games · M below it”. Invalid sessions show “Not counted” |
| Financials | The saved cost estimate: court cost with the calculation, shuttle lines, entrance fees (₱fee × players · misc) when set, total, break-even per player, what players paid (custom amount or break-even), and expected collection with profit / loss / breaks even. “No cost estimate was saved for this session.” when none. States that ROTRA doesn't collect or track payments |

**Replay (How the night ran tab).** A card showing every court as it looked at one moment: each busy court drawn with its players stacked on each side of the net (tap a player for their profile) and “#match · N min”, free courts greyed. Under it a play/pause button, the current time, a timeline slider from the first match start to the last match end, and the end time; a summary reads “7:55 PM · 2 games on court · 7 finished so far”. Dragging the slider moves through the night; **Play** advances one session minute every 120 ms (a three-hour night in about 20 seconds) and stops at the end. Matches on court at that moment are highlighted in the court columns below. The slider has an accessible name and reports the time as its value.

Payment tracking lives in the **Financials** tab: below the estimate, the [payments checklist](financials-inventory.md#q-payments--payments-checklist) shows who has paid, collected, still due and collected against costs. Contact details are not shown there.

## Acceptance examples

- Declining to publish does not stop global rank updates.
- Exporting slides 1 and 2 never includes an Off Day frame.
- Opening Publish after sharing Off Day once still starts with Off Day unchecked.
- A 30-player standings export as Story produces three standings images.
- A guest can win MVP but still has no global profile link.
- No five-session baseline means no fabricated Most Improved/Off Day award.
