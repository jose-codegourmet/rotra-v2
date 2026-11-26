# Back to preparation: undo Start before any game begins

Status: TICKETED — #1136
Date: 2026-11-25
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › live console header › ⋯ More for this session › Back to preparation… (SHEETS.backToPrep, ACT.confirmBackToPrep, helper backToPrepBlocker)
Route: /queue/sessions/<live session>, then ⋯ › Back to preparation…
Screen ID: Q-CONSOLE (session-console.md), D-BACK-TO-PREP (dialogs.md)
Artifact: none
Components: the console's More menu, ConfirmSheet
Supersedes: none
Superseded by: none

## What changed
- The live console's ⋯ **More for this session** menu gains **Back to preparation…** after Home.
  - Moved (D-2026-11-26-05, #1140): the opener is now the **Back to preparation…** button in the Settings tab's Setup head, after **All session settings**; the ⋯ menu is gone. The rules and D-BACK-TO-PREP are unchanged.
  It is disabled, with the reason on a second line, once any match has started or been recorded
  ("Not available once a game has started.") and offline ("Needs an internet connection.").
- It opens **Back to preparation?** (D-BACK-TO-PREP): "TITLE goes back to preparation, as if it
  had not started." and a list of what happens:
  - "Every player's level unlocks."
  - "The start time clears, and the planned time goes back to Sat, Nov 28, 7:00–9:00 PM."
  - "N match(es) in the Main Queue or on court is/are removed." (only when there are any)
  - "Join requests closed at Start stay closed. The session link takes new requests again."
  Actions **Keep it live** and primary **Back to preparation**.
- Confirming undoes Start: the session is prepared again, the start time clears, every level
  unlocks, the planned start and end and each court's planned start return to what they were before
  Start (a late or other-day start had changed them), waiting and Getting ready matches are removed,
  and the app opens the preparation page. Toast: "Back to preparation · levels unlocked · N matches
  removed" (the last part only when there were any).

## Why
- Owner, November 25, 2026, on the live console: "we should have an option to back to preparation".
- Owner decisions the same day:
  - Allowed only **before any game starts** (no match active, completed or invalid), so no results,
    minimums or ranks need undoing.
  - **Undo Start fully**: levels unlock, the start time clears, the planned times go back to what they
    were before Start; join requests closed at Start stay closed, new ones open again.
  - Placed in the **⋯ menu with a confirm**; Session done stays the footer's only action.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: menu item enabled; disabled after a game started (reason line); disabled offline (reason
  line); dialog with and without queued matches; dialog after a late or other-day start (shows the
  original planned time, not the new end); success lands on the preparation page with levels
  unlocked.
- Copy: "Back to preparation…", "Not available once a game has started.", "Needs an internet
  connection.", "Back to preparation?", "TITLE goes back to preparation, as if it had not
  started.", "Every player's level unlocks.", "The start time clears, and the planned time goes
  back to PLANNED.", "N match(es) in the Main Queue or on court is/are removed.", "Join requests
  closed at Start stay closed. The session link takes new requests again.", "Keep it live", "Back
  to preparation", toast "Back to preparation · levels unlocked · N matches removed".
- Tokens: none.
- Known differences: none.

## Reuse plan
- Reuses as is: ConfirmSheet (the dialog), the console More menu (one more item).
- Extends: the session console container — a back-to-preparation mutation and its blocker.
- Shares work with: 2026-11-25-queue-early-day-start.md (the start that moves the planned times this
  undoes).

## Docs updated
- Business logic: docs/business_logic/product/queue/modules/sessions/README.md — "Back to
  preparation".
- Database design: docs/database_design/product/queue/modules/sessions-roster.md —
  `planned_start_before_start_at`, `planned_end_before_start_at` and the level-lock unlock.
- Screen docs: docs/screens/product/modules/queue/session-console.md (More menu item) and
  docs/screens/product/dialogs.md (D-BACK-TO-PREP).

## Real app work
- **Owner decision, November 25, 2026:** keep the pre-Start planned times in new columns
  (migration). Built in this branch, not yet ticketed or merged:
  - Migration `20261125000100_session_back_to_preparation`: `queue_sessions.planned_start_before_start_at`
    and `planned_end_before_start_at` (nullable pair), and `session_players_level_lock` allowing the
    one unlock (level and assessment unchanged, session prepared with no start time). Applied to
    the shared database on 2026-11-25.
  - Start writes the pair. `backToPreparation` (`packages/db/src/queue/session-preparation.ts`,
    `POST /api/sessions/[sessionId]/back-to-preparation`) refuses once a match is Playing, done or
    invalid; removes waiting and On court matches (holds released, as Session done does), closes
    open match requests and drop-out notices, sets the session prepared with no start time or
    license term, puts the planned window back, clears early-opened courts, unlocks every level and
    recomputes a calculated minimum. Courts need no copy: Start never changes a court's planned
    start in the database.
  - Sessions started before the migration have no kept window; going back keeps their current
    planned times, and the dialog shows those.
  - Mock mode: `backToPreparation` in `packages/data/src/queue-session/mutations.ts`; Start keeps
    `plannedBeforeStart`.
  - UI: ConsoleHeaderActions' ⋯ item with `backToPreparationBlocker()`, the BackToPreparation
    ConfirmSheet container, the toast and the preparation page.
