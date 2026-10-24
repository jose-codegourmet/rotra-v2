# View: Que Master — Add Match

## Purpose
The interface where the Que Master selects players from the session pool to build a new match. Accessed from an empty court's `+ ADD MATCH` button or from the Queue tab's add action. Players are sorted by longest wait time by default. The Que Master has full control over team composition.

## Route
`/sessions/:id/add-match` — Que Master and Club Owner only

## Roles
**Que Master**, **Club Owner**.

---

## Layout
Full-screen page with a header, a search + sort bar, and the player pool as a scrollable list. A sticky bottom bar shows team composition in progress and the confirm button.

```
┌──────────────────────────────────────┐
│  ← Cancel        Add Match           │  ← Header bar
├──────────────────────────────────────┤
│  [ 🔍 Search players... ]  [ Sort ▾ ]│  ← Search + sort bar
├──────────────────────────────────────┤
│                                      │
│  ┌─────────────────────────────────┐ │  ← Player pool row
│  │ [av]  Alex Santos               │ │  ← Name
│  │       Intermediate  · Warrior 2 │ │  ← Level · tier badge
│  │       ★ 3.8  ·  Wait 28 min     │ │  ← Skill rating · wait time
│  │       2 matches today           │ │  ← Games in session
│  │  [ TEAM A ]     [ TEAM B ]      │ │  ← Assignment buttons
│  └─────────────────────────────────┘ │
│                                      │
│  ┌─────────────────────────────────┐ │
│  │ [av]  Maria Cruz                │ │
│  │       Advanced  ·  Elite 1      │ │
│  │       ★ 4.2  ·  Wait 31 min     │ │
│  │       1 match today             │ │
│  │  [ TEAM A ]     [ TEAM B ]      │ │
│  └─────────────────────────────────┘ │
│                                      │
└──────────────────────────────────────┘
├──────────────────────────────────────┤
│  TEAM A: Alex, Maria   vs   TEAM B: Jose, Ana │  ← Team composition
│  [ CLEAR ]               [ ADD TO QUEUE ] │  ← Actions
└──────────────────────────────────────┘
```

---

## Components

### Header Bar
- Left: `← Cancel` — text link, `color-text-secondary` — dismisses without saving
- Title: `Add Match` — `text-heading`, centered
- Background: `color-bg-base`, border-bottom: 1px solid `color-border`
- Height: 56px

### Search + Sort Bar
- Layout: search input (fills ~75% of width) + `Sort ▾` button (25%, secondary outline)
- Search input: 48px height, `color-bg-elevated`, `radius-md`, leading search icon
- Placeholder: `Search players...`
- Real-time filter: updates list as QM types (no debounce needed — small list)
- Sort button: tap → bottom sheet with sort options

**Sort Options (bottom sheet):**
- ◉ Waiting Time (longest first) — default
- ○ Name (A–Z)
- ○ Skill Rating (highest first)
- ○ Games Played (fewest first)
- ○ Playing Level

### Player Pool Row
- Height: 88px
- Background: `color-bg-surface`, border-bottom: 1px solid `color-border`
- No card radius — full-width rows with dividers
- Padding: `space-3` vertical, `space-4` horizontal

**Row contents:**
- Avatar (36×36px, `radius-full`)
- Name: `text-body` (15px, Regular), `color-text-primary`
- Level + Tier: `text-small`, `color-text-secondary` — `Intermediate · Warrior 2`
  - Tier badge: small colored pill (5×12px circle indicator in tier color — grey/green/blue/purple/red/gold)
- Skill rating: star icon (16px) + value (`text-small`, `color-text-primary`) + `·` + wait time (`text-small`, `color-text-secondary`)
- Games today: `text-small`, `color-text-disabled` — `[N] match[es] today`
- Status badge (right side, top-right of row): current player status pill
  - `I Am Prepared` → `color-accent-subtle` + `color-accent` text (eligible)
  - `Waiting` → `color-bg-elevated` + `color-text-secondary` (eligible)
  - `Resting` → `color-bg-elevated` + `color-text-disabled`
  - `Playing` → `color-accent-subtle` + `color-accent` (already in a match)

**Team Assignment Buttons (bottom of row):**
Two side-by-side buttons, 36px height, equal width:
- `TEAM A` — secondary outline button
- `TEAM B` — secondary outline button
- When assigned to Team A: `TEAM A` button turns solid `color-accent` background; `TEAM B` becomes disabled
- When assigned to Team B: `TEAM B` button turns solid `color-accent` background; `TEAM A` becomes disabled
- Tap assigned button again → deselects (removes from team)

**Already assigned indicator:** a row that's already assigned to a team shows a colored left stripe (2px) — `color-accent` for Team A assignment, `#FFB800` for Team B

**Not eligible (Playing/Suspended/Exited):** row is visually dimmed (`opacity: 0.5`), team buttons disabled

### Team Composition Summary (Sticky Bottom Bar)
- Background: `color-bg-surface`, border-top: 1px solid `color-border`
- Padding: `space-4`
- Content row:
  - Left: `TEAM A:` + comma-separated names (or `Empty` if none) — `text-small`, `color-text-primary`; vs separator: `text-small`, `color-text-secondary`; right: `TEAM B:` + names
  - Names truncate at 2 per team shown; overflow: `+1 more`
- Team slot progress: `[N]/[max] per team` — `text-micro`, `color-text-disabled`, below names
- Action row (two buttons):
  - `CLEAR` — text button, `color-text-secondary` — clears all team assignments
  - `ADD TO QUEUE` — primary `color-accent`, right-aligned; disabled until each team has the correct number of players (= players_per_court ÷ 2)

---

## States

### Default (All Eligible Players Visible)
All `I Am Prepared` and `Waiting` players shown. Others dimmed.

### Searching
Live-filtered list. If no results match: inline empty state below search bar.

### Teams in Progress
Assignment buttons on rows reflect current state. Bottom bar updates live.

### Ready to Submit
Both teams filled to correct size. `ADD TO QUEUE` button becomes active.

### Player Count Mismatch
If QM tries to add unequal teams: `ADD TO QUEUE` stays disabled; bottom bar shows `text-small`, `color-warning`: `Teams must have equal players.`

---

## Modals

### Edit Match Teams Modal
Accessible by tapping a queued match card in the Queue tab. Same layout as Add Match but pre-populated with existing team assignments.

- Title: `Edit Match — Queue #[N]` — `text-title`
- Same player pool list as Add Match view, scrollable inside a tall bottom sheet (`radius-xl` top corners)
- Current team assignments pre-shown (colored buttons and left stripe)
- Actions:
  - Primary: `SAVE CHANGES` — `color-accent`
  - Secondary: `Cancel` — outline

### Delete Match Confirm Modal
Triggered by swiping a queue card to delete.

- Title: `Remove This Match?` — `text-title`, `color-text-primary`
- Body: `Team A: [names] vs Team B: [names]` — `text-body`, `color-text-secondary`
- `Players will be returned to the queue pool.` — `text-small`, `color-text-secondary`
- Actions:
  - Primary: `REMOVE MATCH` — destructive outline (`color-error` border + text)
  - Secondary: `Keep` — `color-accent` filled (keeping the match is the safer action)

---

## Responsive Layout

### Breakpoints
| Breakpoint | Layout change |
|-----------|--------------|
| Mobile < 768px | Full-screen page, sticky bottom team bar |
| Tablet 768–1023px | Full-screen page, `max-width: 720px`, sticky team bar |
| Desktop ≥ 1024px | Two-panel layout: player pool left, team builder right |

### Desktop (≥ 1024px)

```
┌────────────┬──────────────────────────┬──────────────────────┐
│  Sidebar   │  PLAYER POOL  (~60%)     │  MATCH BUILDER (~40%)│
│            │                          │                      │
│            │  [ Search... ] [ Sort ▾] │  TEAM A              │
│            │  ─────────────────────── │  Alex S.    [ × ]    │
│            │  [player rows with       │  Maria C.   [ × ]    │
│            │   TEAM A / TEAM B        │                      │
│            │   assignment buttons]    │  vs                  │
│            │                          │                      │
│            │                          │  TEAM B              │
│            │                          │  Jose R.    [ × ]    │
│            │                          │  ─ (empty slot) ─    │
│            │                          │                      │
│            │                          │  Teams: 2/2 · 1/2    │
│            │                          │                      │
│            │                          │  [ ADD TO QUEUE ]    │
│            │                          │  [ CLEAR ALL ]       │
└────────────┴──────────────────────────┴──────────────────────┘
```

- **Player Pool panel** (~60%): scrollable list of all pool rows; each row has TEAM A / TEAM B buttons
- **Match Builder panel** (~40%): persistent right panel showing current team composition
  - Team A section: list of assigned players with `×` remove button per player; empty slots shown as dashed placeholder rows
  - Team B section: same format
  - `vs` divider centered between teams
  - Slot progress: `[N]/[required] players` per team — `text-small`, `color-text-secondary`
  - `ADD TO QUEUE` primary CTA at bottom of panel (full-width within panel)
  - `CLEAR ALL` secondary below it
- **Sticky bottom team bar**: removed on desktop (Match Builder panel takes over)
- **Cancel button**: becomes a `← Back` header link or `ESC` key action
- **Content max-width**: full width of main area (panel split)

**Player row on desktop:**
- Hover state: `color-bg-elevated` row background
- TEAM A / TEAM B buttons are always visible (no need for touch-size minimum on desktop — 32px height acceptable)

**Modals on desktop:**
- Edit Match Teams: opens as a right-side drawer (480px wide, slides in from right) rather than a bottom sheet
- Delete Match confirm: centered overlay

### Tablet (768–1023px)
- Full-screen page, `max-width: 720px`
- Sticky bottom team bar stays

---

## Design Tokens
| Token | Usage |
|-------|-------|
| `color-bg-base` | Page background |
| `color-bg-surface` | Player rows, sticky bar, modals |
| `color-bg-elevated` | Search input, sort button, waiting status badge |
| `color-accent` | Team A assignment button, ADD TO QUEUE CTA, active tab |
| `color-accent-subtle` | I Am Prepared badge, Team A assigned row stripe |
| `color-warning` | Team B assigned stripe, mismatch error |
| `color-error` | Remove Match destructive button |
| `color-text-primary` | Player names, team summary names |
| `color-text-secondary` | Level, wait time, sort bar |
| `color-text-disabled` | Games today, not-eligible dimming |
| `text-body` 15px | Player names |
| `text-small` 13px | Level, skill rating, wait time, status |
| `text-micro` 10px | Team slot progress |
| `radius-full` | Avatars |
| `radius-md` | Search input, sort button |
| `motion-spring` 400ms | Queue reorder animation (in Queue tab) |
