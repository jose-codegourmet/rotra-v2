# View: Post-Match Review

## Purpose
The post-match review flow where players rate each other after a completed match. Covers both the skill dimension numeric ratings (1–5 per dimension) and an optional anonymous text note. This flow is triggered from a push notification or from the in-app review prompt. Players have a 24-hour window to submit.

## Route
`/review/:match_id` — authenticated, for players and Que Masters who participated in the match

## Roles
- **Player**: rates every other player in the same match (not themselves), optionally adds anonymous text
- **Que Master**: rates every player in the match, adds an optional attributed note (140 char max)
- **Assigned Umpire (authenticated)**: rates each player 1–5 per dimension, no text; optional

---

## Report to admins (complaints)

From the post-match flow or session summary (same club context), authenticated members may open **Report session** or **Report Que Master** (targets `session` or `que_master` in `complaints`). Modal: required reason text + optional context. See [`../../../database/12_club_governance.md`](../../../database/12_club_governance.md).

---

## Layout
Full-screen multi-step flow. One player is reviewed per step (step 1 of N where N = other players in the match). After rating all players, a final summary and submit screen is shown. No bottom navigation bar — this is an isolated modal-like flow.

```
┌──────────────────────────────────────┐
│  ← Back     Review (2 of 3)     Skip │  ← Header: progress + skip
├──────────────────────────────────────┤
│                                      │
│  Rate this player                    │  ← Section title
│                                      │
│         [  avatar  ]                 │
│         Alex Santos                  │  ← Reviewed player name
│         Intermediate · Warrior 2     │  ← Level + tier badge
│                                      │
│  ── Skill Dimensions ──────────────  │
│                                      │
│  Attack                              │  ← Dimension label
│  [ ○ ○ ○ ● ○ ]                       │  ← 5-tap rating (1–5 dots)
│                                      │
│  Defense                             │
│  [ ○ ○ ● ○ ○ ]                       │
│                                      │
│  Net & Touch                         │
│  [ Skip — tap to rate ]              │  ← Optional: skipped by default
│                                      │
│  Precision & Control                 │
│  [ ○ ○ ○ ○ ● ]                       │
│                                      │
│  Athleticism                         │
│  [ ○ ○ ● ○ ○ ]                       │
│                                      │
│  Game Intelligence                   │
│  [ ○ ○ ○ ● ○ ]                       │
│                                      │
│  ── Leave a note (optional) ────────  │
│  [ _________________________ ]       │  ← Textarea, 280 char, anonymous
│  0/280 · Anonymous                   │  ← Char counter + attribution note
│                                      │
│  [ NEXT PLAYER → ]                   │  ← Proceed to next player
│                                      │
└──────────────────────────────────────┘
```

---

## Components

### Header Bar
- Left: `← Back` text link — tap → Dismiss/Skip confirm modal
- Center: `Review ([N] of [Total])` — `text-heading`, centered — shows progress in the multi-player flow
- Right: `Skip` text link — `text-small`, `color-text-secondary` — skips rating this specific player entirely (no data submitted for them)
- Background: `color-bg-base`
- Height: 56px

### Progress Indicator
- Thin segmented progress bar below the header
- N segments = number of players to review; filled segments = `color-accent`; unfilled = `color-bg-elevated`
- No percentage numbers — visual only

### Reviewed Player Card
- Centered block with:
  - Avatar: 56×56px, `radius-full`, 2px `color-bg-elevated` border
  - Display name: `text-title` (22px, SemiBold), `color-text-primary`, centered
  - Level + tier badge: `text-small`, `color-text-secondary` — e.g. `Intermediate · Warrior 2`
    - Tier color dot (8px) inline before tier name

### Skill Dimension Rating (per dimension)

6 dimensions: **Attack**, **Defense**, **Net & Touch**, **Precision & Control**, **Athleticism**, **Game Intelligence**

**Layout per dimension:**
- Label: `text-body` (15px), `color-text-primary`
- Rating control: 5 tappable targets in a row
  - Each target: 44×44px touch area (accessible minimum), centered on a 16px filled/empty circle
  - Filled circle: `color-accent` (`#00FF88`), 16px, `radius-full`
  - Empty circle: `color-bg-elevated`, 16px, `radius-full`, `color-border` stroke
  - On tap: all circles to the left and selected fill in `color-accent`; circles to the right empty out
  - Animation: `motion-fast` (100ms ease-out) on each tap
- Skip state (not yet touched): `text-small`, `color-text-disabled` — `Tap to rate (optional)` centered below the circles
- Sub-skill hint (collapsed): chevron `▸` after label — tap to expand sub-skill descriptions for context (e.g. Attack: *Smash power, court pressure, shot selection*)
  - Expanded text: `text-small`, `color-text-secondary`, italic-style
- Row height when collapsed: 56px; expanded: variable

**At least 1 dimension must be rated** before the player can proceed to the next. The rest are optional.

### Note Field (Players only — anonymous; QM has attributed note)

**Player version:**
- Label: `Leave a note (optional)` — `text-small`, `color-text-secondary`, uppercase
- Textarea: 3-line visible, auto-expands, `color-bg-elevated`, `radius-md`, `text-body`, `color-text-primary`
- Placeholder: `Write something about this player's performance...` — `color-text-secondary`
- Character counter: `0/280` — `text-small`, `color-text-secondary`, right-aligned below textarea
  - Turns `color-error` at ≥ 260 chars
- Attribution note: `Anonymous` — `text-micro`, `color-text-disabled` — fixed below counter
- Profanity filter: submission blocked if content flagged; inline error shown below field: `text-small`, `color-error`

**QM version:**
- Label: `Add a note (optional — attributed to you)` — same style
- Character limit: 140 chars
- Attribution note: `Visible to player as a note from the Que Master` — `text-micro`, `color-text-disabled`

**Umpire version:**
- No text note field (umpires rate numerically only)

### Navigation Buttons
- `NEXT PLAYER →` — Primary `color-accent`, full-width, 48px height — proceeds to next player in the review sequence
  - Label changes to `REVIEW SUMMARY →` on the last player
  - Disabled until at least 1 dimension is rated for the current player
- On last player, tapping → navigates to Review Summary screen (see below)

---

## Review Summary Screen
Shown after all players are rated.

```
┌──────────────────────────────────────┐
│  ← Back      Review Summary          │  ← Header
├──────────────────────────────────────┤
│                                      │
│  You rated 3 players                 │  ← Summary title
│                                      │
│  ┌────────────────────────────────┐  │  ← Rated player summary row
│  │ [av]  Alex Santos   ★ 3.8 avg │  │  ← Name + average of rated dims
│  │       6 dimensions · 1 note   │  │  ← Rated dims + note flag
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │ [av]  Maria Cruz    ★ 4.2 avg │  │
│  │       5 dimensions · no note  │  │
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │ [av]  Jose Reyes    Skipped   │  │  ← Skipped player
│  └────────────────────────────────┘  │
│                                      │
│  +5 EXP for submitting!              │  ← EXP callout, color-accent
│                                      │
│  [ SUBMIT REVIEWS ]                  │  ← Primary CTA
│  [ Save Draft — Submit Later ]       │  ← Secondary option (within window)
│                                      │
└──────────────────────────────────────┘
```

**Rated Player Row:**
- Avatar (28×28px) + name (`text-body`) + average rating (`text-small`, `color-accent`) + dimension + note count (`text-small`, `color-text-secondary`)
- Skipped player: greyed row — `opacity: 0.5`; label: `Skipped` in place of rating

**EXP Callout:**
- `+5 EXP for submitting!` — `text-body`, `color-accent`, Bold, centered
- Icon: lightning bolt (16px, `color-accent`)

**Submit Button:**
- `SUBMIT REVIEWS` — Primary `color-accent`, full-width, 48px
- Tap → Submit Review confirm modal

**Save Draft:**
- `text-small`, `color-text-secondary`, centered below submit: `Save and submit later (window closes in [Xh Ym])`
- Tap → saves draft locally; player is returned to the session or home screen

---

## States

### First Player (Step 1 of N)
Progress bar shows 1/N filled. No back on first step; `← Back` exits with confirmation.

### All Skipped
If all players were skipped, the summary shows all as skipped and `SUBMIT REVIEWS` is disabled. Text below: `Rate at least one player to submit.`

### Window Closed
If player opens the review link after 24 hours:
- Full-screen message: `Review Window Closed` — `text-display`, `color-text-primary`
- Body: `The review window for this match has closed.` — `text-body`, `color-text-secondary`
- No rating UI shown

---

## Modals

### Submit Review Confirm Modal
Triggered by `SUBMIT REVIEWS` on the summary screen.

- Background: `color-bg-surface`, `radius-xl`, `shadow-modal`
- Backdrop: `rgba(0,0,0,0.6)`
- Title: `Submit Your Reviews?` — `text-title`, `color-text-primary`
- Body: `Ratings are final once submitted. Anonymous text notes cannot be edited after submission.` — `text-body`, `color-text-secondary`
- EXP reminder: `+5 EXP · Awards after submission` — `text-small`, `color-accent`
- Actions:
  - Primary: `SUBMIT` — `color-accent`, full-width
  - Secondary: `Go Back` — outline, full-width

### Dismiss / Skip Review Confirm Modal
Triggered when `← Back` is tapped during the review flow (not on the summary screen).

- Title: `Leave Review?` — `text-title`
- Body: `Your progress will be saved. You can come back to review within 24 hours.` — `text-body`, `color-text-secondary`
- Actions:
  - Primary: `SAVE AND EXIT` — `color-accent`, full-width (saves draft progress)
  - Secondary: `KEEP REVIEWING` — outline, full-width

---

## Responsive Layout

### Breakpoints
| Breakpoint | Layout change |
|-----------|--------------|
| Mobile < 768px | Full-screen step-by-step flow |
| Tablet 768–1023px | Centered `max-width: 560px`, same step flow |
| Desktop ≥ 1024px | Side-by-side: player list left, rating form right |

### Desktop (≥ 1024px)

```
┌────────────┬──────────────────────────┬──────────────────────┐
│  Sidebar   │  PLAYERS TO REVIEW (~35%)│  RATE PLAYER  (~65%) │
│            │                          │                      │
│            │  ✓ Alex Santos ★ rated   │  [av] Jose Reyes     │
│            │  ✓ Maria Cruz  ★ rated   │  Intermediate · W2   │
│            │  → Jose Reyes  (current) │                      │
│            │  ○ Ana Santos  (pending) │  Attack              │
│            │                          │  [ ○ ○ ○ ● ○ ]      │
│            │                          │                      │
│            │                          │  Defense             │
│            │                          │  [ ○ ○ ● ○ ○ ]      │
│            │                          │  ... (all dims)      │
│            │                          │                      │
│            │                          │  Note (optional)     │
│            │                          │  [textarea]          │
│            │                          │                      │
│            │                          │  [ NEXT PLAYER → ]   │
└────────────┴──────────────────────────┴──────────────────────┘
```

- **Left panel** (~35%): persistent list of all players to review
  - Each row: avatar + name + status icon (✓ rated, → current, ○ pending, ⊘ skipped)
  - Clicking a row jumps to that player's form (non-linear navigation available on desktop)
  - Current player row: `color-accent-subtle` background + `color-accent` left stripe
- **Right panel** (~65%): the rating form for the currently selected player
  - Same form spec as mobile; more breathing room with `space-6` padding
  - Dimension rating rows have more spacing between them
- **Progress bar**: moves to top of the right panel
- **Review Summary**: shown in the right panel when all players are rated (left panel shows all as ✓)
- **Content max-width**: `1000px`
- **Modals**: All modals (Submit confirm, Dismiss confirm) render as centered overlays

### Tablet (768–1023px)
- Centered `max-width: 560px`
- Step-by-step flow retained (no side-by-side)

---

## Design Tokens
| Token | Usage |
|-------|-------|
| `color-bg-base` | Page background |
| `color-bg-surface` | Review summary rows, modals |
| `color-bg-elevated` | Empty rating circles, textarea, segmented bar unfilled |
| `color-accent` | Filled rating circles, EXP callout, submit CTA, progress bar fill |
| `color-error` | Char counter overflow, profanity filter error |
| `color-text-primary` | Player name, dimension labels, input values |
| `color-text-secondary` | Labels, metadata, attribution note |
| `color-text-disabled` | Skip state hint, window closed message |
| `text-title` 22px SemiBold | Player name on rating card |
| `text-body` 15px | Dimension labels, note textarea |
| `text-small` 13px | Char counter, sub-skill hints |
| `text-micro` 10px | Attribution note, EXP hint |
| `radius-full` | Avatar, rating circles |
| `radius-md` | Textarea |
| `motion-fast` 100ms | Rating circle tap animation |
