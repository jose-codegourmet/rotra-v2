# View: Club Blacklist

## Purpose
Allows the Club Owner to view and manage permanently banned players for their club. Blacklisted players are silently blocked from all entry points to the club. This view is accessible from the Statistics tab (Membership section) and from Club Settings → Member Management.

## Route
`/clubs/:id/blacklist` — Club Owner only

## Roles
**Club Owner** of this specific club only.

---

## Layout
Full-screen page with header. Content is a scrollable list of blacklisted player entries. A sticky "Add to Blacklist" action button is fixed at the bottom above the navigation bar.

```
┌──────────────────────────────────────┐
│  ← Back           Blacklist          │  ← Header bar
├──────────────────────────────────────┤
│                                      │
│  2 players blacklisted               │  ← Count, text-small, color-text-secondary
│                                      │
│  ┌────────────────────────────────┐  │  ← Blacklist entry card
│  │  [avatar]  Miguel Torres       │  │  ← Name
│  │            Que Master (former) │  │  ← Previous role
│  │  Blacklisted on: Mar 15, 2024  │  │  ← Date
│  │  Note: Repeated no-shows       │  │  ← Internal note (owner-only)
│  │                  [ REMOVE ]    │  │  ← Remove from blacklist CTA
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  [avatar]  Ana Reyes           │  │
│  │            Player (former)     │  │
│  │  Blacklisted on: Feb 3, 2024   │  │
│  │  No internal note              │  │
│  │                  [ REMOVE ]    │  │
│  └────────────────────────────────┘  │
│                                      │
└──────────────────────────────────────┘
├──────────────────────────────────────┤
│       [ + ADD TO BLACKLIST ]         │  ← Sticky action button
└──────────────────────────────────────┘
│  [Home] [Clubs] [Sessions] [Profile] [🔔] │
```

---

## Components

### Header Bar
- Back arrow (icon button) → returns to `/clubs/:id/manage` Statistics tab
- Title: `Blacklist` — `text-heading` (18px, SemiBold), centered
- Background: `color-bg-base`, border-bottom: 1px solid `color-border`
- Height: 56px

### Count Label
- Text: `[N] player[s] blacklisted` — `text-small`, `color-text-secondary`
- Margin: `space-4` horizontal, `space-5` top/bottom

### Blacklist Entry Card
- Background: `color-bg-surface`
- Border: 1px solid `color-border`
- Border radius: `radius-lg` (14px)
- Padding: `space-4` (16px)
- Shadow: `shadow-card`
- Margin: `space-3` between cards, `space-4` horizontal

**Card layout:**
- Row 1: Avatar (36×36px, `radius-full`, greyscale filter applied visually to indicate banned status) + Name (`text-heading`, `color-text-primary`) + Previous role label (`text-small`, `color-text-secondary`, e.g. `Que Master (former)` or `Player (former)`)
- Row 2: `Blacklisted on:` + date — `text-small`, `color-text-disabled`
- Row 3: `Note:` + internal note text — `text-small`, `color-text-secondary`; or `No internal note` — `color-text-disabled` italic-style
- Row 4 (right-aligned): `REMOVE` — destructive outline button (36px height, `color-error` border + label)
  - Tap → Remove from Blacklist confirm modal

### Sticky Add to Blacklist Button
- Fixed to bottom of screen, above bottom nav bar
- Background bar: `color-bg-surface`, border-top: 1px solid `color-border`
- Padding: `space-4`
- Button: `+ ADD TO BLACKLIST` — Primary (`color-accent`), full-width, 48px height
- Tap → Add to Blacklist modal

---

## States

### Populated List
Default state — entries shown as described above.

### Empty Blacklist
- Centered empty state with top padding `space-10`
- Primary text: `No blacklisted players.` — `text-heading`, `color-text-primary`
- Secondary text: `Players added to the blacklist will appear here.` — `text-body`, `color-text-secondary`
- Sticky "Add to Blacklist" button still visible

---

## Modals

### Add to Blacklist Modal
Triggered when Club Owner taps `+ ADD TO BLACKLIST`.

- Background: `color-bg-surface`, `radius-xl`, `shadow-modal`
- Backdrop: `rgba(0,0,0,0.6)`
- Title: `Add Player to Blacklist` — `text-title`, `color-text-primary`
- Search input: `Search player by name...` — full-width, 48px, `color-bg-elevated`, `radius-md`
  - Searches across: all current and former members of this club
  - Search results appear below input as a scrollable list (max 5 rows visible before scroll):
    - Each row: avatar + name + status (current member / former member) — `text-body` + `text-small`
    - Tap row to select; selected row gets `color-accent` left border highlight
- Note field (visible after selecting a player): `Internal note (optional)` — textarea, 200 char max, `color-bg-elevated`, `radius-md`
  - Hint below field: `text-micro`, `color-text-disabled`: `This note is only visible to you.`
- Actions:
  - Primary: `BLACKLIST [PLAYER NAME]` — `color-error` background (destructive primary), full-width, disabled until player selected
  - Secondary: `Cancel` — outline, full-width

**Confirmation step (second sheet layer or inline):**
After tapping the blacklist button:
- Confirm prompt: `Are you sure? This player will be silently blocked from all entry points to this club.` — `text-body`, `color-text-secondary`
- Final actions: `CONFIRM BLACKLIST` (destructive) · `Go Back` (text link)

### Remove from Blacklist Confirm Modal
Triggered when Club Owner taps `REMOVE` on an entry.

- Title: `Remove [Player Name] from Blacklist?` — `text-title`, `color-text-primary`
- Body: `They will be able to request to join this club again, but will not be re-added automatically.` — `text-body`, `color-text-secondary`
- Actions:
  - Primary: `REMOVE FROM BLACKLIST` — outline button, `color-text-primary` (neutral, not destructive — this is a positive action)
  - Secondary: `Cancel` — subtle text link

---

## Responsive Layout

### Breakpoints
| Breakpoint | Layout change |
|-----------|--------------|
| Mobile < 768px | Single column list, sticky add button at bottom |
| Tablet 768–1023px | Single column, `max-width: 640px`, sticky add button |
| Desktop ≥ 1024px | Left sidebar + two-column entry grid, inline add button |

### Desktop (≥ 1024px)

- **Navigation**: Left sidebar, no back button — accessible from the Club Owner Hub
- **Page header**: Inline title row with `[N] players blacklisted` left + `+ ADD TO BLACKLIST` button right (no sticky bottom bar on desktop)
- **Entry cards**: 2-column grid (`repeat(2, 1fr)`, gap `space-4`) rather than stacked single column
  - Each card maintains the same structure; `REMOVE` button stays bottom-right of card
- **Content max-width**: `960px`

**Add to Blacklist Modal on desktop:**
- Centered overlay (`max-width: 540px`, vertically centered)
- Search results list: `max-height: 320px`, scrollable within modal
- Two-step confirmation flows as a single modal with step transition (slide-left)

**Remove from Blacklist Modal on desktop:**
- Centered overlay (`max-width: 440px`), same content

### Tablet (768–1023px)
- Single column, `max-width: 640px`
- Sticky add button retained

---

## Design Tokens
| Token | Usage |
|-------|-------|
| `color-bg-base` | Page background |
| `color-bg-surface` | Entry cards, sticky bar, modals |
| `color-bg-elevated` | Search input, note textarea |
| `color-error` | Remove button, blacklist CTA in modal |
| `color-accent` | Add to Blacklist primary button |
| `color-border` | Card borders, dividers |
| `color-text-primary` | Player names |
| `color-text-secondary` | Roles, notes, metadata |
| `color-text-disabled` | Dates, empty states, "no note" |
| `text-heading` 18px SemiBold | Header bar, card name, empty state title |
| `text-body` 15px | Modal body, search results |
| `text-small` 13px | Card metadata, count label |
| `text-micro` 10px | Note hint |
| `radius-lg` 14px | Entry cards |
| `radius-full` | Avatars |
| `shadow-card` | Entry cards |
| `shadow-modal` | Modals |
