# View: Club Discovery

## Purpose
Allows players to search for and browse public clubs. Private clubs are not discoverable here — they can only be joined via invite link or direct invite. This view is also the entry point to viewing a club's public profile before deciding to join.

## Route
`/clubs/discover` — authenticated users only

## Roles
All authenticated roles: **Player**, **Que Master**, **Club Owner**.

---

## Layout
Full-screen scrollable page with bottom navigation. Top section is a sticky search bar. Below it, a vertical list of club cards.

```
┌──────────────────────────────────────┐
│  ← Back          Discover Clubs      │  ← Header bar
├──────────────────────────────────────┤
│  [ 🔍  Search clubs...             ] │  ← Sticky search bar
├──────────────────────────────────────┤
│                                      │
│  ┌────────────────────────────────┐  │  ← Club card
│  │  Sunrise Badminton Club        │  │  ← Club name
│  │  Quezon City · 24 members      │  │  ← Location · member count
│  │  Competitive · Est. Jan 2024   │  │  ← Club description snippet
│  │                   [ JOIN → ]   │  │  ← CTA button
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  Metro Badminton               │  │
│  │  Makati · 12 members           │  │
│  │  Casual social play            │  │
│  │                   [ VIEW → ]   │  │  ← Already a member
│  └────────────────────────────────┘  │
│                                      │
│  Showing 12 results                  │  ← Results count, text-small
│                                      │
└──────────────────────────────────────┘
│  [Home] [Clubs] [Sessions] [Profile] [🔔] │
```

---

## Components

### Header Bar
- Back arrow (icon button) → returns to previous screen (usually `/home` or `/clubs`)
- Title: `Discover Clubs` — `text-heading` (18px, SemiBold), centered
- Background: `color-bg-base`, border-bottom: 1px solid `color-border`
- Height: 56px

### Search Bar (Sticky)
- Positioned below the header, sticks to top on scroll
- Background: `color-bg-base` (matches page — seamless look)
- Input: full-width, 48px height, `color-bg-elevated` background, `radius-md`
- Leading icon: search icon (20px, stroke, `color-text-secondary`)
- Placeholder: `Search clubs...` — `color-text-secondary`
- Clear button (✕ icon): appears when input has content; clears and refocuses
- Search is live — results filter as user types with 300ms debounce
- Below search bar: thin `color-border` divider

### Club Card
- Background: `color-bg-surface`
- Border: 1px solid `color-border`
- Border radius: `radius-lg` (14px)
- Padding: `space-4` (16px)
- Shadow: `shadow-card`
- Margin: `space-3` (12px) bottom between cards; `space-4` (16px) horizontal

**Card Contents:**
- Club name: `text-heading` (18px, SemiBold), `color-text-primary`
- Location + member count: `text-small` (13px), `color-text-secondary` — e.g. `Quezon City · 24 members`
- Description snippet: `text-body` (15px), `color-text-secondary`, max 2 lines, truncated with ellipsis
- Founded date: `text-small`, `color-text-disabled` — e.g. `Est. Jan 2024`
- Right-aligned CTA button (secondary size, 36px height):
  - Not a member + auto-approve ON: `JOIN →` — `color-accent` filled, small
  - Not a member + auto-approve OFF: `REQUEST →` — outline button
  - Already a member: `VIEW →` — `color-text-secondary` label, subtle button
  - Pending request: `PENDING` — disabled, `color-text-disabled`
- Tap anywhere on card (except CTA) → navigates to `/clubs/:id` (Club Profile)

### Results Count
- `text-small` (13px), `color-text-secondary`
- Shown below the last result: `Showing X results`
- Updates as search filters results

---

## States

### Default (No Search)
All discoverable public clubs shown, newest first (or featured clubs at top per Admin configuration).

### Searching
Live-filtered list updates as user types. Matching characters in club names are not highlighted in MVP.

### No Results
- Empty state illustration area (neutral placeholder, no specific art direction)
- Primary message: `No clubs found` — `text-heading`, `color-text-primary`
- Secondary: `Try a different search term or check your spelling.` — `text-body`, `color-text-secondary`

### Loading
- Skeleton cards (3 placeholder cards) during initial load or search debounce
- Skeleton uses `color-bg-elevated` blocks at heights matching name, metadata, and description rows

---

## Responsive Layout

### Breakpoints
| Breakpoint | Layout change |
|-----------|--------------|
| Mobile < 768px | Single column, full-width list |
| Tablet 768–1023px | Single column, `max-width: 640px`, centered |
| Desktop ≥ 1024px | Left sidebar nav + 2-column club card grid |

### Desktop (≥ 1024px)

- **Navigation**: Left sidebar (see Home for spec), no back button needed — accessible directly from sidebar
- **Search bar**: stays full-width within content column, `max-width: 860px`
- **Club cards**: change from a vertical list to a **2-column card grid**
  - Grid: `repeat(2, 1fr)`, gap `space-4`
  - Card height: uniform (fixed at ~140px with consistent content truncation)
  - CTA button: bottom-right corner of card
- **Results count**: shown above the grid, left-aligned
- **Content max-width**: `860px`, centered in main area (sidebar-adjusted)
- **Empty state**: centered within the 2-column grid area

### Tablet (768–1023px)
- Single column list, `max-width: 640px`, centered
- Bottom nav bar

---

## Design Tokens
| Token | Usage |
|-------|-------|
| `color-bg-base` | Page + search bar background |
| `color-bg-surface` | Club cards |
| `color-bg-elevated` | Search input, skeleton loaders |
| `color-accent` | Join button |
| `color-border` | Card borders, divider |
| `color-text-primary` | Club names |
| `color-text-secondary` | Metadata, description, results count |
| `color-text-disabled` | Founded date, pending CTA |
| `text-heading` 18px SemiBold | Club name, empty state |
| `text-body` 15px | Description snippet |
| `text-small` 13px | Metadata, results count |
| `radius-lg` 14px | Club cards |
| `radius-md` 10px | Search input |
| `shadow-card` | Club card shadow |
