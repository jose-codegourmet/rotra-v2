# View: Own Profile

## Purpose
The player's own editable profile page. Same content as the public profile view but with additional edit controls, private sections (received reviews), and access to the EXP ledger. The player can manage their gear collection, update their personal details, and set their play style preferences here.

## Route
`/profile` (or `/profile/:own_id`) — authenticated, viewing own profile

## Roles
**Player**, **Que Master**, **Club Owner** — each seeing their own profile only.

---

## Layout
Same scrollable structure as the public profile, but with edit affordances inline throughout. An "Edit Profile" floating button appears in the hero section. Private sections are visible only here.

```
┌──────────────────────────────────────┐
│  Profile              [Settings ⚙]   │  ← Header bar (no back button)
├──────────────────────────────────────┤
│                                      │
│         [  avatar  ]  [Edit Photo]   │  ← Avatar + edit photo link
│         Alex Santos      [Edit ✏]   │  ← Name + edit button
│         Intermediate  [Change ▾]     │  ← Level + change dropdown
│         ┌─────────────────────────┐  │  ← Tier + EXP + EXP ledger link
│         │ 🟩 Warrior 2  ·  620 EXP│  │
│         │            [ EXP LOG →] │  │
│         └─────────────────────────┘  │
│                                      │
│  ── Stats ────────────────────────   │  ← (same as public, read-only here)
│  [stats grid, same as player_profile]│
│                                      │
│  ── Skill Self-Assessment ────────   │  ← Private section (own only)
│  Set your baseline until enough      │  ← Helper text
│  match data is available.            │
│  ▸ Attack         [ ● ○ ○ ○ ○ ]     │  ← Slider (1–5 dots)
│  ▸ Defense        [ ● ● ○ ○ ○ ]     │
│  ...                                 │
│                                      │
│  ── Skill Rating ─────────────────   │  ← Same as public view
│  [radar chart + dimension rows]      │
│                                      │
│  ── Play Style ───────────────────   │  ← Editable (tap to change)
│  Doubles  ·  Front Court  ·  Social  │
│                              [Edit]  │
│                                      │
│  ── Gear ─────────────────────────   │
│  RACKETS                [+ Add]      │  ← Add button per category
│  [gear item card]       [Edit] [🗑]  │  ← Inline edit + delete
│                                      │
│  SHOES                  [+ Add]      │
│  [gear item card]       [Edit] [🗑]  │
│                                      │
│  BAGS                   [+ Add]      │
│  (no bags added)                     │
│                                      │
│  ── Reviews I've Received ─────────  │  ← Private section (own only)
│  [ VIEW MY REVIEWS ]                 │  ← Requires acknowledgment
│                                      │
│  ── Match History ────────────────   │
│  [same as public view]               │
│                                      │
│  ── Advanced Stats ───────────────   │
│  [same as public view]               │
│                                      │
└──────────────────────────────────────┘
│  [Home] [Clubs] [Sessions] [Profile] [🔔] │
```

---

## Components

### Header Bar
- No back arrow (this is a tab root)
- Title: `Profile` — `text-heading`, left-aligned
- Right: **Edit account** link (Settings icon) → [`/settings/account`](./account_settings.md) — name, password (tester), and account deletion
- Background: `color-bg-base`

### Avatar with Edit Photo
- Avatar: 72×72px, `radius-full`, 2px `color-bg-elevated` border, centered
- Below avatar: `Edit Photo` — `text-small`, `color-accent`, tappable — triggers system image picker / camera

### Name + Level Row
- Display name: `text-display` (28px, Bold), `color-text-primary`
- Inline edit icon (pencil, 20px): `color-text-secondary` — tap → Edit Profile modal
- Playing level: `text-small` pill + `Change ▾` trigger — tap → level selector bottom sheet (Beginner / Intermediate / Advanced)

### Tier + EXP + EXP Ledger Link
- Same strip as public profile
- Additional: `EXP LOG →` link right-aligned inside the strip — `text-small`, `color-accent` — navigates to `/profile/exp-ledger`

### Skill Self-Assessment (Private Section)
- Only visible on own profile
- Shown when skill rating dimension has fewer than 5 external ratings
- Header: `Skill Baseline` — `text-small`, `color-text-secondary`, uppercase
- Helper text: `text-small`, `color-text-secondary`: `Set your baseline until enough match data is available. This phases out as ratings come in.`
- Each dimension: label (`text-body`, `color-text-primary`) + 5-dot selector (tap to set 1–5)
  - Dot: 16×16px circle, `radius-full`; filled = `color-accent`; empty = `color-bg-elevated`
- Changes auto-save on tap (no save button — immediate feedback)

### Play Style (Editable)
- Same display as public profile
- `Edit` text link right of section header → Play Style Edit bottom sheet:
  - 3 preference groups (Format, Court Position, Play Mode)
  - Each group: horizontal chip select (multi-select allowed)
  - Chips: toggleable — selected = `color-accent` border + `color-accent` text; unselected = `color-bg-elevated` + `color-text-secondary`
  - Save button: `SAVE` bottom sheet sticky button, `color-accent`

### Gear Section (Editable)
- Section header per category with `+ Add` button (secondary outline, 36px height, right-aligned)
- Each gear item:
  - Same card style as public view
  - Two inline action buttons below card content:
    - `Edit` — text link, `color-accent` — tap → Edit Gear modal (pre-populated)
    - Trash icon button — `color-text-secondary` → Delete Gear confirm modal
- Empty category state: `+ Add your first [racket/shoe/bag]` — `text-body`, `color-text-disabled`, centered in a dashed card

### Reviews I've Received (Private Section)
- Section header: `Reviews I've Received`
- First-time access: locked state with a notice — `text-body`, `color-text-secondary`: `Reviews from opponents are aggregated here. Individual reviewers remain anonymous.`
- Button: `VIEW MY REVIEWS` — secondary outline, full-width
  - Tap → Reviews Acknowledgment modal (one-time, then shows review content)
- After acknowledgment: displays aggregated per-dimension text notes
  - Grouped by skill dimension, most recent first
  - Each note: quoted text (`text-body`, `color-text-secondary`, italic) + date + match ref (`text-small`, `color-text-disabled`)

---

## Modals

### Edit Profile Modal
Triggered by pencil icon next to name.

- Background: `color-bg-surface`, `radius-xl`, `shadow-modal`
- Backdrop: `rgba(0,0,0,0.6)`
- Title: `Edit Profile` — `text-title`
- Fields:
  - Display Name: text input, pre-filled, max 50 chars
  - Playing Level: radio group (Beginner / Intermediate / Advanced) — same as inline selector
  - Play Style (Format, Court Position, Play Mode): chip-based multi-select groups
- Actions:
  - Primary: `SAVE CHANGES` — `color-accent`, full-width
  - Secondary: `Cancel` — outline, full-width

### Add / Edit Gear Modal

**Racket fields:**
- Title (required), Brand (required), Model (required), Balance Type (select: Head Heavy / Head Light / Even Balanced), String Brand, String Model, String Tension (number + unit toggle), Grip, Where to Buy (URL input with `+ Add another link`), Description (textarea, 200 char)

**Shoes fields:**
- Title (required), Brand (required), Model (required), Size (number + country sizing label), Fit Type (select: Wide / Narrow / Standard), Where to Buy, Description

**Bags fields:**
- Title (required), Brand (required), Model, Size/Capacity, Where to Buy, Description

**Common modal structure:**
- Background: `color-bg-surface`, `radius-xl`, `shadow-modal`
- Title: `Add Racket` / `Edit Racket` / `Add Shoes` / etc. — `text-title`
- Full-height bottom sheet with scrollable form
- Fields: standard input spec (48px, `color-bg-elevated`, `radius-md`)
- Required fields marked with `*`
- Where to Buy: tappable `+ Add link` adds another URL input row; each row has a `×` remove button
- Actions (sticky at bottom of sheet):
  - Primary: `SAVE` — `color-accent`, full-width
  - Secondary: `Cancel` — outline, full-width

### Delete Gear Confirm Modal
Triggered by trash icon on a gear card.

- Title: `Remove This [Racket/Shoe/Bag]?` — `text-title`, `color-text-primary`
- Body: gear title + brand/model — `text-body`, `color-text-secondary`
- Actions:
  - Primary: `REMOVE` — destructive outline (`color-error` border + text)
  - Secondary: `Cancel` — `color-accent` filled

### Reviews Acknowledgment Modal
Triggered once (first time) when player taps `VIEW MY REVIEWS`.

- Background: `color-bg-surface`, `radius-xl`, `shadow-modal`
- Backdrop: `rgba(0,0,0,0.6)`
- Title: `About Your Reviews` — `text-title`, `color-text-primary`
- Body (2–3 paragraphs):
  - `These are aggregated summaries of what other players said about you after matches.`
  - `Individual reviewers are always anonymous — you will not see who wrote each note.`
  - `Reviews reflect match performance. If you believe a review is abusive, you can flag it.`
- Checkbox: `I understand and want to see my reviews` — must be checked before proceeding
- Action:
  - Primary: `VIEW MY REVIEWS` — `color-accent`, disabled until checkbox checked
  - Secondary: `Not Now` — text link

---

## Responsive Layout

### Breakpoints
| Breakpoint | Layout change |
|-----------|--------------|
| Mobile < 768px | Single column scroll |
| Tablet 768–1023px | Single column, `max-width: 640px`, centered |
| Desktop ≥ 1024px | Two-column layout mirroring the public profile |

### Desktop (≥ 1024px)

Same two-column layout as `player_profile.md` but with edit affordances visible in both columns:

```
┌────────────┬──────────────────────────┬──────────────────────┐
│  Sidebar   │  LEFT COLUMN  (~35%)     │  RIGHT COLUMN (~65%) │
│            │                          │                      │
│            │  [avatar]  [Edit Photo]  │  ── Stats ─────────  │
│            │  Alex Santos  [Edit ✏]   │  [stat tiles]        │
│            │  Intermediate [Change]   │                      │
│            │  🟩 Warrior 2 [EXP LOG→] │  ── Self-Assessment ─│
│            │                          │  [dimension sliders] │
│            │  ── Play Style  [Edit] ─ │                      │
│            │  [style chips]           │  ── Skill Rating ──  │
│            │                          │  [radar + breakdown] │
│            │  ── Gear ──────────────  │                      │
│            │  RACKETS  [+ Add]        │  ── Reviews ───────  │
│            │  [gear cards]            │  [VIEW MY REVIEWS]   │
│            │  SHOES    [+ Add]        │                      │
│            │  [gear cards]            │  ── Match History ─  │
│            │  BAGS     [+ Add]        │  [match rows]        │
│            │                          │                      │
│            │                          │  ── Advanced Stats ─ │
└────────────┴──────────────────────────┴──────────────────────┘
```

- **Left column**: sticky (same as public profile), contains all identity + gear edit sections
- **Right column**: stats, self-assessment, skill rating, reviews, match history, advanced stats
- **Gear CRUD modals on desktop**: All gear modals (Add/Edit Gear) render as right-side drawers (480px wide, slides from right) — better for long forms than centered overlays
  - Delete Gear and Edit Profile modals: centered overlays (`max-width: 480px`)
- **Reviews Acknowledgment modal**: centered overlay (`max-width: 480px`)
- **Play Style edit**: bottom sheet becomes centered overlay on desktop
- **Content max-width**: `1100px`

### Tablet (768–1023px)
- Single column, `max-width: 640px`

---

## Design Tokens
(Same as `player_profile.md` plus:)
| Token | Usage |
|-------|-------|
| `color-accent` | Edit links, add gear buttons, self-assessment dots, chip selection |
| `color-error` | Delete/remove destructive actions |
| `color-text-disabled` | Empty gear state, review lock state |
| `text-display` 28px Bold | Player name in hero |
| `text-small` 13px | Edit photo link, EXP ledger link, self-assessment helper |
| `radius-xl` 20px | Modal |
| `shadow-modal` | Modal shadow |
