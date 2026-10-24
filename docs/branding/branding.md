# Rotra — Design System Specification

**Version:** 1.0 · **Platform:** Mobile-first web app (PWA) · **Theme:** Dark mode only

---

## 1. Brand Identity

**Product name:** ROTRA (always all-caps in UI)
**Tagline:** Run the game.
**Positioning:** The operating system for badminton sessions — queue management, skill tracking, and match flow in one place.

**Personality keywords:** Precise · Fast · Neutral · Reliable

---

## 2. Color Palette

### Background Scale

| Token               | Hex       | Usage                                      |
|---------------------|-----------|--------------------------------------------|
| `color-bg-base`     | `#0B0B0C` | App background, page root                  |
| `color-bg-surface`  | `#1A1A1D` | Cards, modals, bottom sheets               |
| `color-bg-elevated` | `#2A2A2E` | Inputs, hover states, nested cards         |
| `color-bg-overlay`  | `#3A3A3F` | Tooltips, dropdowns, active row highlights |

### Text Scale

| Token                  | Hex       | Usage                          |
|------------------------|-----------|--------------------------------|
| `color-text-primary`   | `#F0F0F2` | Headlines, labels, active text |
| `color-text-secondary` | `#9090A0` | Captions, placeholders, hints  |
| `color-text-disabled`  | `#4A4A55` | Disabled inputs, muted states  |

### Accent

| Token                    | Hex       | Usage                                                                |
|--------------------------|-----------|----------------------------------------------------------------------|
| `color-accent`           | `#00FF88` | Primary CTA buttons, active/playing indicators, selected tab         |
| `color-accent-dim`       | `#00CC6A` | Pressed/active state for accent buttons                              |
| `color-accent-subtle`    | `#00FF8820`| Accent tint backgrounds (e.g. "Your turn" banners, highlighted rows)|

### Semantic Colors

| Token             | Hex       | Usage                                  |
|-------------------|-----------|----------------------------------------|
| `color-error`     | `#FF4D4D` | Validation errors, destructive actions |
| `color-warning`   | `#FFB800` | Warnings, pending states               |
| `color-success`   | `#00FF88` | Same as accent (shared)                |
| `color-border`    | `#2A2A2E` | Card borders, dividers                 |
| `color-border-strong` | `#404048` | Focus rings, active card borders   |

---

## 3. Typography

**Primary font:** [Satoshi](https://fontshare.com/fonts/satoshi) — preferred
**Fallback:** Inter, system-ui, sans-serif

### Type Scale

| Token         | Size  | Weight      | Line Height | Letter Spacing | Usage                          |
|---------------|-------|-------------|-------------|----------------|--------------------------------|
| `text-display`| 28px  | 700 (Bold)  | 1.2         | -0.5px         | Screen titles, hero labels     |
| `text-title`  | 22px  | 600 (SemiBold)| 1.3       | -0.3px         | Section headers, card titles   |
| `text-heading`| 18px  | 600 (SemiBold)| 1.4       | -0.2px         | Sub-section labels, list headers|
| `text-body`   | 15px  | 400 (Regular)| 1.5        | 0px            | Primary body text              |
| `text-small`  | 13px  | 400 (Regular)| 1.4        | 0.1px          | Captions, timestamps, metadata |
| `text-label`  | 12px  | 500 (Medium) | 1.2        | 0.5px          | Tags, badges, button labels    |
| `text-micro`  | 10px  | 500 (Medium) | 1.2        | 0.8px          | Status chips, pill text        |

**Rule:** All caps (`text-transform: uppercase`) only on `text-label` and `text-micro` tokens.

---

## 4. Spacing & Layout

**Base unit:** 4px

| Token    | Value | Usage                          |
|----------|-------|--------------------------------|
| `space-1`| 4px   | Micro gaps (icon + text)       |
| `space-2`| 8px   | Tight padding (chips, badges)  |
| `space-3`| 12px  | Compact padding (list items)   |
| `space-4`| 16px  | Standard padding (cards, rows) |
| `space-5`| 20px  | Section padding                |
| `space-6`| 24px  | Card inner padding             |
| `space-8`| 32px  | Section vertical spacing       |
| `space-10`| 40px | Screen top/bottom padding      |

**Screen horizontal padding:** 16px (mobile), 24px (tablet)
**Max content width:** 480px (centered on larger screens)

---

## 5. Border Radius

| Token           | Value | Usage                                  |
|-----------------|-------|----------------------------------------|
| `radius-sm`     | 6px   | Badges, chips, tags                    |
| `radius-md`     | 10px  | Buttons, inputs                        |
| `radius-lg`     | 14px  | Cards, modals, bottom sheets           |
| `radius-xl`     | 20px  | Large surface panels                   |
| `radius-full`   | 9999px| Pills, avatar circles, toggle sliders  |

---

## 6. Shadows & Elevation

| Token             | Value                                      | Usage                     |
|-------------------|--------------------------------------------|---------------------------|
| `shadow-card`     | `0 2px 12px rgba(0,0,0,0.4)`              | Cards on `bg-base`        |
| `shadow-modal`    | `0 8px 32px rgba(0,0,0,0.6)`              | Modals, bottom sheets     |
| `shadow-accent`   | `0 0 16px rgba(0,255,136,0.25)`           | Glowing CTA button        |

---

## 7. Components

### Buttons

**Primary Button**
- Background: `color-accent` (`#00FF88`)
- Text: `#0B0B0C` (black), `text-label` token, uppercase
- Height: 48px
- Padding: 0 24px
- Border radius: `radius-md` (10px)
- Box shadow: `shadow-accent`
- Pressed state: background → `color-accent-dim`, scale 0.97

**Secondary Button (Outline)**
- Background: transparent
- Border: 1.5px solid `color-border-strong`
- Text: `color-text-primary`, `text-label` token, uppercase
- Height: 48px
- Padding: 0 24px
- Border radius: `radius-md`
- Pressed state: background → `color-bg-elevated`

**Destructive Button**
- Background: `#FF4D4D20`
- Border: 1.5px solid `#FF4D4D`
- Text: `#FF4D4D`, `text-label` token

**Icon Button**
- Size: 40×40px
- Background: `color-bg-elevated`
- Border radius: `radius-md`
- Icon size: 20px

---

### Cards

- Background: `color-bg-surface`
- Border: 1px solid `color-border`
- Border radius: `radius-lg`
- Padding: `space-6` (24px)
- Shadow: `shadow-card`

**Active/Selected card variant:**
- Border: 1px solid `color-accent-dim`
- Left accent stripe: 3px solid `color-accent`

---

### Inputs & Text Fields

- Height: 48px
- Background: `color-bg-elevated`
- Border: 1.5px solid `color-border`
- Border radius: `radius-md`
- Padding: 0 `space-4`
- Text: `text-body`, `color-text-primary`
- Placeholder: `color-text-secondary`
- Focus border: `color-accent`
- Error border: `color-error`

---

### Player Row (Queue / Leaderboard)

- Height: 64px
- Layout: horizontal flex — [rank/position] [avatar] [name + skill level] [status badge]
- Background: `color-bg-surface`
- Bottom divider: 1px solid `color-border`
- Active/playing highlight: `color-accent-subtle` background

**Avatar**
- Size: 36×36px
- Border radius: `radius-full`
- Border: 2px solid `color-bg-elevated`
- Fallback: initials on `color-bg-elevated` background, `text-small` weight 600

**Status Badge**
- Pill shape: `radius-full`
- Sizes: auto width, 22px height
- Padding: 0 8px
- `text-micro` token, uppercase
- States:
  - Playing → background `color-accent-subtle`, text `color-accent`
  - Waiting → background `color-bg-elevated`, text `color-text-secondary`
  - Ready → border 1px solid `color-accent`, text `color-accent`, transparent bg

---

### Court Card

- Background: `color-bg-surface`
- Header bar: `color-bg-elevated`, contains court name (`text-heading`) + status badge
- Content: 2-column grid showing Team A vs Team B player names
- "VS" divider: `text-small`, `color-text-secondary`, centered
- Score field (if active): `text-display`, `color-text-primary`, centered

---

### Navigation Bar (Bottom)

- Background: `color-bg-surface`
- Height: 64px + safe area inset
- Border top: 1px solid `color-border`
- Active tab icon + label: `color-accent`
- Inactive tab: `color-text-disabled`
- Active indicator: 2px top border on active tab icon, `color-accent`

---

### Toast / Notification

- Background: `color-bg-overlay`
- Border radius: `radius-lg`
- Padding: 12px 16px
- Text: `text-body`, `color-text-primary`
- Max width: 320px, centered top
- Entrance animation: slide down + fade in, 200ms ease-out
- Exit: fade out 150ms

**Voice examples (copy in toasts):**
- "You're up." · "Queue updated." · "Match ready." · "Score saved."

---

## 8. Iconography

- Style: Stroke-based, **not** filled (except accent active states)
- Stroke width: 1.5px
- Size: 20px default (16px compact, 24px large)
- Recommended library: [Lucide Icons](https://lucide.dev) or [Phosphor Icons](https://phosphoricons.com) (regular weight)
- Color: inherit from text context; accent icons use `color-accent`

---

## 9. Motion & Animation

| Token                | Duration | Easing         | Usage                              |
|----------------------|----------|----------------|------------------------------------|
| `motion-fast`        | 100ms    | ease-out       | Button press, icon state changes   |
| `motion-default`     | 200ms    | ease-in-out    | Card expand, tab switch            |
| `motion-slow`        | 350ms    | ease-in-out    | Sheet slide-up, modal open         |
| `motion-spring`      | 400ms    | spring(120,20) | Drag-and-drop queue reorder        |

**Rules:**
- No decorative animations — every motion carries meaning
- Queue reorder: smooth drag with spring snap
- Real-time updates: row highlight pulses once with `color-accent-subtle`, fades in 400ms
- Score changes: number morphs with 150ms cross-fade

---

## 10. Logo Specification

**Wordmark:** ROTRA
- Font: Satoshi 700 or custom geometric sans
- Tracking: -1px to -2px (tight)
- Color: `color-text-primary` on dark backgrounds, `#0B0B0C` on light/accent backgrounds

**Minimum size:** 80px wide (wordmark), 24px tall

**Clear space:** Equal to the height of the "R" character on all sides

**Future symbol concept:**
- Abstract rotation / orbit shape (references queue rotation system)
- Geometric, single-color
- Works at 16×16px (favicon) and 512×512px (app icon)

**App icon (PWA):**
- Background: `#0B0B0C`
- Mark: `color-accent` (`#00FF88`) centered symbol or wordmark
- Rounded corners per platform convention (iOS 180×180, Android 512×512)

---

## 11. Screen-Level Layout Rules

1. **Status-first hierarchy** — current match/queue state is always the top-most element
2. **One primary action per screen** — single green CTA, never two
3. **Real-time first** — live data rows update in-place without full reloads
4. **Empty states** — always include a short action prompt, never just "No data"
5. **Dense but not cluttered** — player rows are compact (64px); use whitespace between sections not within them

---

## 12. Accessibility Minimums

- All text on `color-bg-base` or `color-bg-surface` must meet **WCAG AA** (4.5:1 contrast for body, 3:1 for large text)
- `color-accent` (`#00FF88`) on `#0B0B0C` = **~10:1 contrast** ✓
- `color-text-primary` (`#F0F0F2`) on `#0B0B0C` = **~18:1 contrast** ✓
- Interactive targets: minimum **44×44px** touch area
- Focus states: 2px solid `color-accent` outline, 2px offset

---
