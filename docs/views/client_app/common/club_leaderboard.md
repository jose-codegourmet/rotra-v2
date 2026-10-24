# View: Club Leaderboard

## Purpose
The cumulative ranked standings for all players within a club. Shows all-time wins, losses, win rate, games played, sessions attended, and skill rating. Updates after each session is finalized. Filterable by time range. Shareable as a link or image card.

## Route
`/clubs/:id/leaderboard` — authenticated users (club members and public if club is public)

## Roles
All authenticated roles. Club members see their own row highlighted. Non-members can view if the club is public.

---

## Layout
Full-screen page with a header, filter bar, and a scrollable ranked table. Sticky table header. Share button in the header bar.

```
┌──────────────────────────────────────┐
│  ← Back  Sunrise BC · Leaderboard [↑]│  ← Header with share icon
├──────────────────────────────────────┤
│  [ All Time ▾ ]  [ All Sessions ▾ ]  │  ← Filter dropdowns
├──────────────────────────────────────┤
│  #   Player          W   L   Win% Rtg│  ← Table header (sticky)
├──────────────────────────────────────┤
│  1  [av] Alex S.  Warrior  42 10 81%  3.8 │  ← Rank row
│  2  [av] Maria C. Elite 1  38 12 76%  4.2 │
│  3  [av] Jose R.  Warrior  30 15 67%  3.5 │
│  ─── (your row, highlighted) ────────
│  12 [av] You       Cadet 2  8   6 57%  2.9 │  ← Highlighted row
│  ...                                 │
└──────────────────────────────────────┘
│  [Home] [Clubs] [Sessions] [Profile] [🔔] │
```

---

## Components

### Header Bar
- Left: back arrow → `/clubs/:id`
- Title: `[Club Name] · Leaderboard` — `text-heading`, truncated if long
- Right: share icon button (upward arrow, 24px stroke) → Share modal
- Background: `color-bg-base`, border-bottom: 1px solid `color-border`
- Height: 56px

### Filter Bar
- Horizontal row of two compact dropdown selectors
- Background: `color-bg-base`, padding `space-4` horizontal
- Selector pill style: `color-bg-elevated`, `radius-full`, `text-small`, `color-text-secondary`, chevron-down icon right

**Filter 1 — Time Range:**
Options: `All Time` · `Last 30 Days` · `Last 90 Days`
Default: `All Time`

**Filter 2 — Session:**
Options: `All Sessions` · individual session entries (date + venue, last 10 sessions listed)
Default: `All Sessions`

On filter change: table data re-fetches and rows animate in (fade + translate, `motion-default`)

### Sticky Table Header
- Columns (left to right): `#` · `PLAYER` · `W` · `L` · `WIN %` · `RATING`
- `text-micro` (10px, Medium), `color-text-disabled`, uppercase
- Background: `color-bg-surface` (sticks to top on scroll)
- Border-bottom: 1px solid `color-border`
- Height: 36px
- Column widths: `#` 28px · `PLAYER` flex · `W` 32px · `L` 32px · `WIN %` 48px · `RATING` 40px

### Leaderboard Row
- Height: 64px (matches Player Row spec from branding)
- Background: `color-bg-surface`
- Border-bottom: 1px solid `color-border`

**Row layout (left to right):**
- Rank number: `text-label` (12px, Medium), `color-text-secondary`; 28px width
  - Top 3 special styling: `#1` in `color-accent`, `#2` in `#C0C0C0` (silver), `#3` in `#CD7F32` (bronze); all Bold
- Avatar: 36×36px, `radius-full`, 2px `color-bg-elevated` border
- Player info block (flex column):
  - Display name: `text-body` (15px), `color-text-primary`
  - Tier badge: small colored dot (8px) + tier name — `text-small`, `color-text-secondary`
- W (wins): `text-body`, `color-text-primary`
- L (losses): `text-body`, `color-text-secondary`
- Win %: `text-body`; shown only when ≥ 5 games — else `—` in `color-text-disabled`
- Rating: `★` + value, `text-body`, `color-accent`; shown only when ≥ 5 rated matches — else `—`

**Viewer's own row:**
- Background: `color-accent-subtle` (`#00FF8820`)
- Rank number: `color-accent`
- Name label: Bold

**Tap any row:** → navigates to `/profile/:id` (player profile)

### Top 3 Podium (Optional visual treatment)
- The first 3 rows optionally rendered as slightly larger cards above the table (same data, condensed card format)
- `#1`: `color-accent` left stripe; `#2`, `#3`: muted left stripe

---

## States

### Loading
- Skeleton table rows (5 placeholder rows, standard row height)
- Filter dropdowns appear as loading pills

### Empty (No Data)
- `text-body`, `color-text-secondary`, centered: `No matches recorded yet.`
- Secondary: `Play and complete matches to see your standings here.`

### Filtered — No Results in Range
- `text-body`, `color-text-secondary`, centered: `No matches in this time range.`
- Reset filter link: `View All Time` — `text-small`, `color-accent`

---

## Modals

### Share Leaderboard Modal
Triggered by the share icon in the header.

- Background: `color-bg-surface`, `radius-xl` (top corners only — slides up from bottom as a bottom sheet)
- Backdrop: `rgba(0,0,0,0.6)`
- Title: `Share Leaderboard` — `text-title`, `color-text-primary`
- 4 action rows, each 56px height with leading icon (20px stroke):
  - `Copy Link` — chain-link icon; copies URL to clipboard; shows "Copied!" inline for 2s
  - `Share Image` — image icon; auto-generates a shareable card image (top 3 + club name + date) and opens system share sheet
  - `Download Image` — download icon; saves generated image to device gallery
  - `View QR Code` — QR icon; replaces sheet content with a full-screen QR view of the leaderboard URL
- Close: drag handle at top of sheet or tap backdrop

**Share Image card spec (auto-generated):**
- Size: 1080×1080px (square)
- Background: `color-bg-base`
- Top: `ROTRA` wordmark + club name
- Podium section: top 3 players with name, avatar, wins, win rate, tier badge
- Footer: `View full standings` + QR code (small, bottom-right) + date

---

## Responsive Layout

### Breakpoints
| Breakpoint | Layout change |
|-----------|--------------|
| Mobile < 768px | Full-width table, compact columns |
| Tablet 768–1023px | `max-width: 720px`, all columns visible |
| Desktop ≥ 1024px | Left sidebar + full-width table with more columns visible |

### Desktop (≥ 1024px)

```
┌────────────┬────────────────────────────────────────────────────┐
│  Sidebar   │  Sunrise BC · Leaderboard                   [ ↑ ]  │
│            ├────────────────────────────────────────────────────┤
│            │  [ All Time ▾ ]  [ All Sessions ▾ ]               │
│            ├────────────────────────────────────────────────────┤
│            │  #1 podium  #2 podium  #3 podium   ← top 3 strip   │
│            ├────────────────────────────────────────────────────┤
│            │  #  PLAYER          W   L  WIN%  GAMES  SESS  RTG  │
│            ├────────────────────────────────────────────────────┤
│            │  1  [av] Alex S. 🟩 42  10  81%   52    18   3.8   │
│            │  2  [av] Maria   🔵 38  12  76%   50    16   4.2   │
│            │  ...                                               │
└────────────┴────────────────────────────────────────────────────┘
```

- **Top-3 Podium strip**: A visual row above the table showing the top 3 players as podium cards (photo, name, wins, tier) — `color-bg-surface`, `radius-lg`, horizontal 3-card layout
  - `#1` card is center and slightly taller (visual prominence)
- **Table on desktop**: All columns from the Club Leaderboard spec are visible (`#`, Player, W, L, Win%, Games, Sessions, Rating)
  - No truncation needed — full-width table with `color-border` column separators
- **Additional columns visible on desktop** (hidden on mobile due to space): `Sessions attended`
- **Column widths**: `#` 40px · `Player` flex (min 180px) · `W` 48px · `L` 48px · `Win%` 64px · `Games` 64px · `Sessions` 72px · `Rating` 56px
- **Filter bar**: stays at top; filters side-by-side
- **Content max-width**: `1100px`
- **Share modal on desktop**: renders as centered overlay, not a bottom sheet; Share Image preview shows a thumbnail of the auto-generated card

### Tablet (768–1023px)
- `max-width: 720px`; all columns visible except Sessions

---

## Design Tokens
| Token | Usage |
|-------|-------|
| `color-bg-base` | Page background, filter bar |
| `color-bg-surface` | Table rows, sticky header, bottom sheet |
| `color-bg-elevated` | Avatar border, filter pill |
| `color-accent` | #1 rank, your row highlight, rating value |
| `color-accent-subtle` | Your row background |
| `color-border` | Row dividers, header border |
| `color-text-primary` | Player name, W values |
| `color-text-secondary` | Tier, L values, rank |
| `color-text-disabled` | Table column headers, gated stats |
| `text-body` 15px | Row content |
| `text-small` 13px | Tier label, filter pills |
| `text-label` 12px | Rank number |
| `text-micro` 10px | Column header labels |
| `radius-full` | Avatars |
| `motion-default` 200ms | Filter change row animation |
