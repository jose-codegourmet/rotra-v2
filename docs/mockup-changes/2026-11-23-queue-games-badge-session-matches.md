# Queue app: the games badge on a face opens that player's matches this session

Status: TICKETED — #1061
Date: 2026-11-23
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › console Courts (Playing and Getting ready court faces), Main Queue tile faces, Generate Queue draft tiles (`draftTile`); new sheet `sessionGames`; `historyMatch(s, m, hl)`
Route: /queue/sessions/s-tonight (console: Courts, Main Queue)
Screen ID: Q-CONSOLE, Q-COURTS, Q-QUEUE
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: court-card, match-card, session-games-dialog (new)
Supersedes: none
Superseded by: none

## What changed
- **Games badge:** before, the small number on a face (games played this session) was display only, and a tap
  anywhere on the face opened the profile. After, a tap on the badge opens **D-SESSION-GAMES**; the rest of the face
  still opens the profile. On the court card faces and the Main Queue tile faces. The badge fills with the accent on
  hover. Badges inside other dialogs (Make this match?, Next on court, swap) stay display only.
- **Generate Queue draft tiles** (owner artifact comment, same day: "instead of showing 2 played 2 suggested just
  show the skill border with games count dialog"): before, each face was a plain picture with small chips under the
  name (“N played”, “N queued”, “N suggested”, “On court” / “Playing now”). After, the chips are gone; each picture has
  the level ring and the games badge, like the Main Queue tiles, and the badge opens D-SESSION-GAMES. Tapping the badge
  doesn't pick the draft; the rest of the tile still does. Busy players still show in the status line (“Waits for …”).
- **D-SESSION-GAMES — “NAME's games”** (wide sheet, bottom sheet on phones):
  - Top: picture, full name, “N games played” (· “includes +N set by hand” when Set games played changed it;
    · “N waiting in the Main Queue” when queued).
  - When the player is on court now: a notice “NAME is playing on Court 2 now (Match 18). It counts after Match
    done.” (“getting ready” for a Getting ready match).
  - Filter pills: **NAME's matches** (count, default) and **All matches** (count), the Match History pill style.
  - The list, newest first: each row has the start time · court · length, a chip on the right, and the small court
    from Match History (`historyMatch`). The player's face is highlighted: a warn ring outside the face and their name
    pill in warn, so it never clashes with the accent ring on the winners. Chips: **Counts** (ok), **Not counted**
    (warn, a substitution that gave the game to the other player), **Invalid · not counted** (bad). In All matches,
    the player's matches get an accent outline around the court and the others are dimmed to 50%.
  - Faces in the list open the profile with Back to this dialog. Footer: **Close**.
  - Empty: “NAME has no finished matches yet this session.”; All matches with none: “No finished matches yet. They
    show here after Match done.”

- **Profile tabs** (owner artifact comment, same day: "please show [ info ] [ x matches ] [ planned queue for the
  night ]; x matches … games played in latest to early order; planned queue … nearest queue to latest queue"): the
  separate dialog above became the **N matches** tab of the club player profile. In a session the profile now has
  **Info** (everything it showed before), **N matches** (the content above, latest first) and **Planned queue · N**
  (the player's waiting Main Queue matches, nearest first: “#N in the Main Queue · K matches ahead” or “· next up”,
  **Nearest** on the first, the match drawn on the court with VS and the player highlighted; empty “NAME isn't in the
  Main Queue right now.”). The badge opens the profile on N matches; the face opens it on Info. Outside a session,
  no tabs.

- **No Info tab** (owner artifact comment, same day: "remove info"): in the live console the profile has only
  **N matches** (default) and **Planned queue · N**; the status line, About, Stats and In your club sections don't show
  there. Saved players and session records keep the full profile with no tabs.

- **No All matches switch** (owner artifact comment, same day: "remove this" on the Their matches / All matches
  pills): the N matches tab shows only the player's own finished matches, latest first. The All matches view, its
  outline and the dimming are gone.

- **Pills, not tabs** (owner artifact comment, same day: "these 2 should be pills"): the two profile tabs are now
  the Match History pill filter: **Matches** and **Planned queue**, each with its count in a round badge (0 shows 0);
  the picked one fills with the accent.

- **Compact games dialog** (owner artifact comment, same day: "make this information compact · this is a games dialog
  only with just name and skill"): the badge no longer opens the profile. It opens its own dialog, "FIRST's games": a
  one-line header (picture with the level ring, full name, level), the Matches and Planned queue pills, the list, and
  Close. No banner, RTR ID, chips or profile footer. The face itself opens the full profile again, with no pills (the
  "profile tabs" and "no Info tab" steps above are undone). Faces inside the games list open the profile with "Back to
  games".

## Why
- Decisions: [D-2026-11-23-10](../mvp/decisions/2026-11-23.md#d-2026-11-23-10).
- Owner, November 23, 2026: “when clicking on the games count it should show a dialog with the matches during that
  session and highlight where Nina is”.

## Open items
- The badge sits inside the face button, so in the mockup it is a click target only (no keyboard focus of its own).
  The real app needs the badge as its own focusable button next to the face button (not nested), named
  “NAME's games this session, N”.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: player's matches with Counts, Not counted and Invalid rows; All matches with highlight and dim; player on
  court now (playing and getting ready); games set by hand; queued; no finished matches; Back from a profile.
- Copy: “NAME's games”, “N games played”, “includes +N set by hand”, “N waiting in the Main Queue”, “NAME is playing
  on Court N now (Match N). It counts after Match done.”, “NAME's matches”, “All matches”, “Counts”, “Not counted”,
  “Invalid · not counted”, “NAME has no finished matches yet this session.”, “No finished matches yet. They show here
  after Match done.”, badge title “NAME's games this session · tap to see them”.
- Tokens: existing `--warn`, `--on-accent`, `--accent`, `--surface`.
- Known differences: none

## Reuse plan
- Reuses as is: the Match History court (`historyMatch` → its real-app component) with a new optional highlighted player.
- Extends: court-card and match-card faces — the badge becomes a button.
- New: session-games-dialog in `@rotra/ui`, built from Sheet, the Match History pill filter and the history court.

## Docs updated
- Business logic: none needed (games played and what counts are unchanged; this only shows them).
- Database design: none needed (reads finished matches already stored).
- Screen docs: [session console](../screens/product/modules/queue/session-console.md) and [match queue](../screens/product/modules/queue/match-queue.md) — the badge opens the dialog; [dialogs](../screens/product/dialogs.md) — D-SESSION-GAMES.
- Terms: none.

## Real app work
- `@rotra/ui`: games badge button on court-card and match-card faces; `SessionGamesDialog` with stories (both themes).
- `apps/queue`: wire the badge to the dialog; the list comes from the session's finished matches already in `@rotra/data`.
