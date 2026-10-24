# View: Player Profile (Public)

## Purpose
The public-facing profile for any player. Visible to all authenticated users. Shows the player's identity, stats, skill ratings, gear, and match history. The level of detail shown is gated by match count. This view is also the destination when another player taps a name in a leaderboard, queue, or match card.

## Route
`/profile/:id` — authenticated users only

## Roles
All authenticated roles. The player viewing their own profile sees an edit button; others see the standard read-only view.

---

## Report to admins (complaints)

When the viewer is an **active member of the same club context** as the profile being viewed (e.g. opened from a club roster or session), show **Report player** in the header overflow (`⋯`). Submits a `complaints` row with `target_type = 'player'` and `target_id` = profile id. Same modal pattern as club profile (reason + optional context). See [`../../../database/12_club_governance.md`](../../../database/12_club_governance.md).

---

## Layout
Single-column scrollable page. No inner tabs — sections stack vertically. Sticky header on scroll that shows the player's name + avatar once the hero section scrolls out of view.

```
┌──────────────────────────────────────┐
│  ← Back                 [Share] [⋯] │  ← Header bar
├──────────────────────────────────────┤
│                                      │
│         [  avatar  ]                 │  ← 72×72px avatar, radius-full
│         Alex Santos                  │  ← Display name (text-display)
│         Intermediate                 │  ← Playing level
│         ┌─────────────────────────┐  │  ← Tier + EXP strip
│         │ 🟩 Warrior 2  ·  620 EXP│  │
│         └─────────────────────────┘  │
│                                      │
│  ── Stats ────────────────────────   │
│  ┌───────┐  ┌───────┐  ┌───────┐    │  ← Stats row (3 tiles)
│  │  42   │  │  28   │  │ 67%   │    │
│  │ Games │  │  Wins │  │Win Rate│   │
│  └───────┘  └───────┘  └───────┘    │
│  ┌───────┐  ┌───────┐  ┌───────┐    │
│  │  12   │  │   3   │  │  ★3.8 │    │
│  │Sessions│ │ Clubs │  │Rating │    │
│  └───────┘  └───────┘  └───────┘    │
│                                      │
│  ── Skill Rating ─────────────────   │
│  Overall: ★ 3.8                      │
│  [Radar chart: 6 dimensions]         │
│  ▸ Attack         ████░  4.1         │
│  ▸ Defense        ███░░  3.5         │
│  ▸ Net & Touch    ███░░  3.2         │
│  ...                                 │
│                                      │
│  ── Play Style ───────────────────   │
│  Doubles  ·  Front Court  ·  Social  │
│                                      │
│  ── Gear ─────────────────────────   │
│  ┌────────────────────────────────┐  │
│  │ RACKETS                        │  │
│  │ Main Racket                    │  │  ← Gear title
│  │ Yonex Astrox 99                │  │  ← Brand + model
│  │ Head Heavy · BG80 · 26lbs      │  │  ← Specs
│  │ [ Buy Link → ]                 │  │
│  └────────────────────────────────┘  │
│                                      │
│  ── Match History ────────────────   │
│  ┌────────────────────────────────┐  │  ← Match row
│  │  Mar 22 · Sunrise BC           │  │
│  │  W  Alex+Maria  vs  Jose+Ana   │  │  ← Result + teams
│  │       21 – 15                  │  │  ← Score
│  └────────────────────────────────┘  │
│  [ View All Matches ]                │
│                                      │
│  ── Advanced Stats ───────────────   │  ← Unlocks at 20 matches
│  Most frequent partner: Maria Cruz   │
│  Best partner win rate: 80%          │
│  Toughest opponent: Jose B.          │
│  ...                                 │
│                                      │
└──────────────────────────────────────┘
│  [Home] [Clubs] [Sessions] [Profile] [🔔] │
```

---

## Components

### Header Bar
- Left: back arrow
- Right: Share icon button (upward arrow) + overflow `···` menu
  - `···` menu: `Compare Players`
- Sticky collapsed header (on scroll past hero): `color-bg-surface`, shows small avatar (24×24) + name — `text-body`, `color-text-primary`; share icon persists right
- Background: transparent → `color-bg-base` on scroll
- Height: 56px

### Profile Hero Block
- Avatar: 72×72px, `radius-full`, 2px `color-bg-elevated` border, centered
- Display name: `text-display` (28px, Bold), `color-text-primary`, centered
- Playing level: `text-small` pill — `color-bg-elevated`, `color-text-secondary`, `radius-full`, `text-micro` uppercase
- Tier + EXP strip: horizontal pill below level
  - Tier color dot (8px) + tier name (`text-body`, `color-text-primary`) + `·` + `[EXP] EXP` (`text-small`, `color-text-secondary`)
  - Background: `color-bg-surface`, `radius-full`, padding `space-2`

### Stats Grid
- 2 rows × 3 tiles
- Each tile: `color-bg-surface`, `radius-md`, `shadow-card`, padding `space-3`
- Value: `text-title` (22px, SemiBold), `color-text-primary`
- Label: `text-micro` (10px), `color-text-secondary`, uppercase
- Win Rate: `color-accent` value
- Skill Rating: `★` prefix, `color-accent` value
- Tiles with gated data (Win Rate, Skill Rating): show `— not enough data` in `color-text-disabled` if < 5 matches

### Skill Rating Section
- Section header: `Skill Rating` — `text-small`, `color-text-secondary`, uppercase
- Overall badge: `★ [value]` — `text-title`, `color-text-primary`
- Radar chart: 6-axis spider chart, `color-accent` fill at 20% opacity, `color-accent` stroke, white axis labels (`text-micro`)
  - Dimensions: Attack, Defense, Net & Touch, Precision & Control, Athleticism, Game Intelligence
  - Size: 200×200px, centered
- Dimension breakdown rows (below chart):
  - Each row: dimension name (`text-body`, `color-text-primary`) + filled progress bar (4px height, `color-accent`, max width = 5/5 rating) + numeric value (`text-small`, `color-accent`)
  - Row height: 32px
  - `▸` collapse trigger on section header — hides individual rows (summary radar only when collapsed)
- `Not enough data` shown for dimensions with fewer than 5 ratings — `text-small`, `color-text-disabled`

### Play Style Block
- Section header: `Play Style`
- Horizontal row of tags: pill-shaped chips
  - Format: `Doubles / Singles / Both`
  - Court position: `Front / Back / Both`
  - Play mode: `Competitive / Social / Both`
  - Chip style: `color-bg-elevated`, `radius-full`, `text-small`, `color-text-secondary`, padding `space-2`

### Gear Section
- Section header: `Gear` with sub-labels: `RACKETS`, `SHOES`, `BAGS` as inline category headers
- Each gear item card:
  - Background: `color-bg-surface`, `radius-lg`, border: 1px solid `color-border`
  - Padding: `space-4`
  - Title: `text-body`, `color-text-primary`, Bold
  - Brand + model: `text-body`, `color-text-secondary`
  - Spec tags: chips (balance, string, tension, etc.) — same chip style as Play Style
  - Buy link(s): `text-small`, `color-accent` — external link icon — `Buy on [site] →`
- If no gear: `text-body`, `color-text-disabled`: `No gear listed.`

### Match History Section
- Section header: `Match History` with `View All →` link right-aligned (`text-small`, `color-accent`)
- Last 5 matches shown as compact rows:
  - Background: `color-bg-surface`, divider between rows
  - Date + Club: `text-small`, `color-text-secondary`
  - Result badge: `W` pill — `color-accent-subtle`, `color-accent`; `L` pill — `color-error` tint, `color-error`
  - Teams: player names in a compressed 2-column format — `text-small`, `color-text-primary`; viewer's name in `color-accent`
  - Score: `text-small`, `color-text-secondary`
  - Row height: 56px

### Advanced Stats Section (unlocks at 20 matches)
- Section header: `Advanced Stats` — with `Unlocks at 20 matches` placeholder if < 20 (`text-small`, `color-text-disabled`)
- When unlocked: plain key-value rows
  - Label: `text-small`, `color-text-secondary`; value: `text-body`, `color-text-primary`
  - Rows: Most frequent partner, Best partner (win rate), Most frequent opponent, Toughest opponent, Peak skill rating, Rating trend (chip: Ascending `color-accent`, Stable `color-text-secondary`, Descending `color-error`), Favourite club, Best session

---

## Modals

### Share Profile Modal
Triggered by the share icon in the header.

- Background: `color-bg-surface`, `radius-xl` (top corners only — slides up from bottom)
- Backdrop: `rgba(0,0,0,0.6)`
- Title: `Share [Player Name]'s Profile` — `text-title`
- 3 action rows:
  - `Copy Link` — link icon + label — copies URL to clipboard, shows inline "Copied!" confirmation
  - `Share Image` — image icon + label — generates and shares a profile card image via system share sheet
  - `Download Image` — download icon + label — saves profile card to device
- Full-screen QR option: `View QR Code` — chevron right → replaces modal content with full-screen QR view
- Close: drag down or `×` top-right

### Player Comparison Entry Modal
Triggered by `···` → `Compare Players`.

- Title: `Compare With...` — `text-title`
- Search input: `Search player by name...` — full-width, `color-bg-elevated`, `radius-md`
- Search results list (up to 8): player rows (avatar + name + tier + level)
- Tap a player → navigates to `/compare/:id1/:id2`
- Cancel: text link or drag-down dismiss

---

## Responsive Layout

### Breakpoints
| Breakpoint | Layout change |
|-----------|--------------|
| Mobile < 768px | Single column scroll |
| Tablet 768–1023px | Single column, `max-width: 640px`, centered |
| Desktop ≥ 1024px | Two-column layout: profile sidebar left, content right |

### Desktop (≥ 1024px)

```
┌────────────┬──────────────────────────┬──────────────────────┐
│  Sidebar   │  LEFT COLUMN  (~35%)     │  RIGHT COLUMN (~65%) │
│            │                          │                      │
│            │  [avatar 80×80]          │  ── Stats Grid ────  │
│            │  Alex Santos             │  [3×2 stat tiles]    │
│            │  Intermediate            │                      │
│            │  🟩 Warrior 2 · 620 EXP  │  ── Skill Rating ──  │
│            │                          │  [radar + breakdown] │
│            │  ── Play Style ────────  │                      │
│            │  [style chips]           │  ── Match History ─  │
│            │                          │  [last 5 matches]    │
│            │  ── Gear ──────────────  │                      │
│            │  [gear cards, stacked]   │  ── Advanced Stats ─ │
│            │                          │  [key-value rows]    │
│            │  [ Share ]  [ Compare ]  │                      │
└────────────┴──────────────────────────┴──────────────────────┘
```

- **Left column** (~35%, `min-width: 280px`): Avatar (80×80px on desktop), name, level pill, tier strip; Play Style tags; Gear cards; Share + Compare action buttons
- **Right column** (~65%): Stats grid (stays 3-column), Skill Rating (radar chart + breakdown), Match History, Advanced Stats
- **Sticky left column**: left column becomes `position: sticky; top: 0` so it stays visible while right column scrolls
- **Avatar**: enlarged to 80×80px on desktop
- **Radar chart**: enlarged to 260×260px on desktop
- **Share + Compare buttons**: horizontal row at the bottom of the left column (not in header)
- **Content max-width**: `1100px`
- **Modals**: Share modal and Comparison modal render as centered overlays (`max-width: 480px`)

### Tablet (768–1023px)
- Single column, `max-width: 640px`
- Sticky scrolling header collapses normally

---

## Design Tokens
| Token | Usage |
|-------|-------|
| `color-bg-base` | Page background |
| `color-bg-surface` | Stat tiles, gear cards, match rows, modals |
| `color-bg-elevated` | Level pill, gear spec chips, play style chips |
| `color-accent` | Win rate, rating, tier EXP strip, match W badge, chart fill |
| `color-accent-subtle` | Radar chart fill, W badge background |
| `color-error` | L badge |
| `color-text-primary` | Name, stat values, gear title |
| `color-text-secondary` | Labels, metadata, gear specs |
| `color-text-disabled` | Gated stat placeholders, gear empty state |
| `text-display` 28px Bold | Player name |
| `text-title` 22px SemiBold | Stat values |
| `text-body` 15px | Team names, gear details |
| `text-small` 13px | Metadata, match rows, dimension ratings |
| `text-micro` 10px | Stat labels, axis labels |
| `radius-full` | Avatar, tier strip, level pill |
| `radius-lg` 14px | Gear cards |
| `shadow-card` | Stat tiles |
