# Shared experience contract

**Status:** Screen-design requirements/proposals for v1. Applies to every module unless a more specific confirmed rule narrows it.

## Audience and action boundaries

- Club operator: one club account; no role switcher, manager invitations, or human-specific attribution that shared credentials cannot support.
- Public viewer: can read allowed profiles, leaderboard, and linked session pages; cannot reserve a slot, toggle attendance, edit matches, or see private contacts.
- Registered player: can edit permitted personal details; phone/email changes require Admin approval. Games, results, local assessments, and calculated rank are not editable.
- Admin: can manage approved configuration and access; cannot edit confirmed winners/scores or reconstruct lost offline records.

Check authorization before rendering sensitive content. A hidden button is not enforcement. A denied view must not briefly show another club's roster, a hidden phone, or private Off Day content.

## Layout and device behavior

Design the Queue app for use courtside on a phone and on a laptop. Keep the current session, connectivity, and primary action visible without forcing a full-page refresh. On narrow screens use one main content column with sheets for secondary controls; on wide screens courts and queue cards flow into more columns (the prototype's queue uses 1–5 columns by width).

The [ROTRA Queue prototype](../../../app/mocksups-app/queue-app/rotra-queue.html) sets the shared patterns: one top bar with sync status; bottom/side **sheets** for every task (with a scrim, a focused title, Escape to close, and a focus trap); short **toasts** confirming each saved action; chips for states; switches for presence and formats; and the court drawn to real proportions with players' pictures on each side of the net.

Keep the main task action visible but avoid overlapping it with system keyboard, safe-area insets, error text, or match-confirmation content. Long names and RTR IDs wrap or truncate with an accessible full-text alternative; they cannot hide the identity needed to choose the correct player.

**Touch sizing (decided October 27, 2026).** The Queue app is mostly used on phones and tablets, so on any touch screen or any window 1024 px or narrower, targets grow: standard buttons are 48 px tall, small and extra-small buttons 44 px, icon buttons at least 44 × 44 px, tabs 48 px, segmented controls 44 px, Present switches 54 × 32 px, and checkboxes 22 px. On queue cards, the drag handle has a 44 px target, player pictures are 40 px, and Start and Edit share the row width. Player and slot cards in match dialogs are at least 60 px tall. Desktop with a mouse keeps the compact sizes.

**Phones (about 375 px wide): nothing scrolls sideways.** Tab bars share the width equally with short labels and counts (e.g. Session 1/3, Queue 2, Players 14/14, Board); page and section action buttons become a tidy two-column grid (an odd last button spans both); Club settings' menu becomes one “☰ section · All settings” button that opens it as a left drawer (only one drawer, main menu or settings, is open at a time); roster rows stack name, then level, then the Present switch and remove; the shuttlecock row puts the brand on its own line; tables become one labelled card per row; the session record's court columns stack; the top bar drops “Queue” and shortens the sync pill to “Synced” / “Offline · N”; setup step labels hide behind numbered bars (the card names the step).

**Player pictures are clickable on operator screens** (queue cards, match dialogs, preparation roster, waitlist, payments, live leaderboard, session record): each opens that player's profile dialog. Opened from inside a dialog, the profile's footer is **Back to suggestion / match / payments**, returning to the same dialog and state; otherwise it is **Close**. Match dialogs (Suggested match, Start match, result, invalid) show each player as a card with picture, name, level, and games against the minimum. Public pages are not part of this.

Use the existing theme tokens for dark and light presentation; both themes ship, dark by default, with a light/dark switch in the Queue top bar. In light mode, cards and fields are white on a soft off-white page with a light shadow, and the accent is a deeper green that passes WCAG AA both as text and behind white button labels (the bright dark-mode green does not, so it must not be reused on light backgrounds). Specify semantic emphasis rather than hardcoded colors. Public reference images do not require the exact Reclub palette or typography. Buttons and switches should have comfortable touch targets; destructive and irreversible actions must not share a single ambiguous icon.

## Accessibility and interaction

- Every input, score side, switch, and icon action has an accessible name.
- Dialogs identify the action, focus their heading/first relevant control, trap focus, and restore it to the trigger on cancellation.
- Keyboard and touch alternatives accompany drag reordering: Move up/Move down is a proposed accessible equivalent.
- Needs attention uses text/icon/border emphasis as well as optional pulse. Respect reduced motion and do not depend on color alone.
- Announce durable-save, sync-failure, and validation messages without moving focus away from the current task.
- Keep field errors next to fields and an actionable summary for multi-field failures. Do not erase entered data after a retryable failure.
- Destructive confirmation is not preselected, and repeated taps cannot create duplicate actions.

## Save and sync language

| State | Proposed user-facing meaning |
|---|---|
| Saving on this device | Local durable write not yet confirmed |
| Saved on this device · waiting to sync | Local write succeeded; cloud has not accepted it |
| Syncing | Upload/reconciliation in progress |
| Synced | Server accepted the relevant work; show last successful sync time |
| Needs attention | A particular lineup, identity, or sync conflict requires review |
| Changes could not be saved | Local persistence failed; do not claim the action completed |

A locally saved winner is still permanent under touch-move; it is merely waiting for upload. Network failure is not permission to change it. If local persistence fails before confirmation is durably recorded, keep the match unresolved and show a recoverable error rather than freeing the court falsely.

A connection icon alone does not prove sync completeness. A live internet connection can coexist with missing original-device records. Public pages show last synced data, not optimistic operator-local changes.

## Standard states

Each module supplements these shared states:

- Initial loading: relevant skeleton/placeholder labels, no fabricated names/results/counts.
- Empty: explain what is missing and offer only the next action allowed for that audience.
- Request error: preserve inputs/data, distinguish retryable failure from permission denial, provide Retry where safe.
- Offline: use downloaded/cached content when available, identify its age, disable online-only actions with explanation.
- Conflict/stale revision: preserve the attempted choice, load authoritative evidence, avoid silent overwrites.
- Permission/license denial: show a bounded access explanation, not partially exposed private data.
- Not found/deleted: do not reveal private identity or retained internal records to public visitors.

## Sensitive and optional information

Phones/emails are never public. Hidden player phones must not appear in operator search results, scan previews, participant cards, downloaded shares, or error messages. Use player ID/QR for identification without requiring the hidden value.

An optional field must stay optional in validation and in the primary completion path. Scores, social links, playing experience, and every financial field cannot become required through an incidental form design. Financial estimates are operator-only and never appear on public pages or exports. No Facebook authentication control is allowed.

RTR city/country codes describe the founding club used for first identity allocation. Do not label that code as a player's current residence.

## Cross-screen invariants

- No player-managed slot entry.
- No public Matches/Chat tabs or required live spectator feed.
- One shared waiting queue; never imply court-specific preassigned queues. Queue order is a suggestion; any ready match can start.
- Match done and Session done use distinct labels and consequences.
- All game results and invalid-match decisions require explicit confirmation and are permanent.
- No finalization/final result slides offline.
- Publication is separate from automatic profile/rank sync.
- Off Day is excluded from sharing/downloads unless explicitly included.
