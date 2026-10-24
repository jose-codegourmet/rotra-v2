# View: Player Onboarding Wizard

## Purpose

A mandatory, one-time profile setup wizard shown to all new players immediately after the phone number onboarding step (`/onboarding/phone`). Collects name, age, playing background, court position, and recent tournament performance to seed the player's public profile.

## Route

`/onboarding/profile` — authenticated new accounts only. Authenticated returning users are redirected to `/home`.

## Roles

New players only (accounts where `onboarding_completed === false`).

---

## Layout

Full-screen page. Background: `color-bg-base` (`#0B0B0C`). A fixed header bar at the top holds the ROTRA wordmark and step progress. The active step's content is centered in the remaining vertical space. A fixed footer holds the primary action button.

```
┌─────────────────────────────────────┐  ← Full screen, bg-base
│  ROTRA                    ● ● ○ ○ ○ │  ← Header: wordmark + step dots
├─────────────────────────────────────┤
│                                     │
│                                     │
│         [Step content area]         │  ← Scrollable if content overflows
│                                     │
│                                     │
├─────────────────────────────────────┤
│  [ Back ]          [ Next / Finish ]│  ← Fixed footer
└─────────────────────────────────────┘
```

---

## Header

- **ROTRA wordmark:** `text-display` (28px, Bold 700), `color-text-primary`, left-aligned, 16px from left edge
- **Step progress dots:** 5 dots, right-aligned, 16px from right edge
  - Active dot: 8px circle, `color-accent` (`#00FF88`), filled
  - Completed dot: 8px circle, `color-accent-dim` (`#00CC6A`), filled
  - Upcoming dot: 8px circle, `color-bg-elevated` (`#2A2A2E`), filled
  - Dot gap: 6px between each
- Header height: 56px
- Bottom border: 1px solid `color-border`
- Background: `color-bg-base`

---

## Footer

- Height: 80px + safe area inset
- Background: `color-bg-base`
- Top border: 1px solid `color-border`
- Padding: 16px horizontal

**Back button** (Steps 2–5 only; hidden on Step 1):
- Style: Secondary Outline button
- Label: `BACK`
- Width: 96px

**Next / Finish button:**
- Style: Primary button (`color-accent` background, black text)
- Label: `NEXT` on steps 1–4; `FINISH` on step 5
- Width: `calc(100% - 96px - 12px)` when Back is visible; `100%` on Step 1
- Disabled state: `color-bg-elevated` background, `color-text-disabled` text — shown when the current step's field is empty or invalid
- Box shadow: `shadow-accent` when active; none when disabled

---

## Step Content Area

Each step occupies the full content area between header and footer. Content is vertically centered with 32px top/bottom padding and 16px horizontal padding.

### Shared step anatomy

```
┌─────────────────────────────────────┐
│                                     │
│  Step X of 5                        │  ← Step counter, text-small, color-text-secondary
│                                     │
│  [Question / prompt headline]       │  ← text-title (22px SemiBold), color-text-primary
│  [Supporting copy if needed]        │  ← text-body (15px), color-text-secondary
│                                     │
│  [Input control]                    │
│                                     │
│  [Inline error message, if any]     │  ← text-small, color-error, icon-left
│                                     │
└─────────────────────────────────────┘
```

---

## Step 1 — Name

```
Step 1 of 5

What should we call you?
We've pre-filled this from your Facebook profile.

┌───────────────────────────────────┐
│  Adrian Buctuanon                 │  ← Text input, pre-filled, height 48px
└───────────────────────────────────┘

  ⚠ Name must be at least 2 characters.  ← Error (hidden by default)
```

### Input spec

- Component: standard text input
- Background: `color-bg-elevated`
- Border: 1.5px solid `color-border`; focus → `color-accent`; error → `color-error`
- Border radius: `radius-md` (10px)
- Height: 48px
- Padding: 0 16px
- Text: `text-body`, `color-text-primary`
- Pre-filled with Facebook display name
- Max length: 40 characters
- Character counter: shown when ≥ 30 characters typed (`text-small`, `color-text-secondary`, right-aligned below input)
- Keyboard: default text; autocapitalize words

### Validation
- Fires on blur and on "Next" tap
- Error shown inline below input with warning icon (`color-error`, `text-small`)

---

## Step 2 — Age

```
Step 2 of 5

How old are you?
Your age is kept private and never shown publicly.

┌───────────────────────────────────┐
│  ─────────────────────────────    │
│          21                       │  ← Scrollable drum picker
│          22                       │  ← Selected (highlighted)
│          23                       │
│  ─────────────────────────────    │
└───────────────────────────────────┘

  ⚠ Please select your age.           ← Error (hidden by default)
```

### Picker spec

- Component: scrollable drum/slot picker (native-style)
- Range: 13–99
- Default: no selection (placeholder row "—" at top of list; selecting it counts as invalid)
- Selected row: `color-text-primary`, `text-title` (22px), center-aligned
- Unselected rows: `color-text-disabled`, `text-body`, center-aligned
- Selection indicator: 1px solid `color-accent` lines above and below selected row
- Background: `color-bg-elevated`, `radius-lg`
- Height: ~160px (shows ~3 rows)
- Width: 120px, centered horizontally

### Validation
- Error fires on "Next" tap if no valid age selected

---

## Step 3 — Playing Since

```
Step 3 of 5

When did you start playing badminton?

  ┌──────────────────────────────┐
  │  Less than 1 year            │  ← Special option chip (top)
  └──────────────────────────────┘

  ┌───────────────────────────────────┐
  │  ─────────────────────────────    │
  │          2013                     │  ← Scrollable year picker
  │          2014                     │  ← Selected
  │          2015                     │
  │  ─────────────────────────────    │
  └───────────────────────────────────┘

  ⚠ Please tell us when you started playing.  ← Error
```

### Spec

**"Less than 1 year" chip:**
- Displayed above the year picker
- Width: 100%
- Height: 48px
- Default: `color-bg-elevated` background, `color-text-secondary` text, `color-border` border
- Selected: `color-accent-subtle` background, `color-accent` text, 1.5px solid `color-accent` border
- Border radius: `radius-md`
- Tapping it selects it and greys out the year picker (opacity 0.4, non-interactive)

**Year picker:**
- Same drum-picker spec as Step 2
- Range: 1960 – current year (descending; most recent at top)
- Default: no selection
- Selecting a year deselects the "Less than 1 year" chip
- Width: 160px, centered

### Validation
- At least one option (chip OR year) must be selected
- Error fires on "Next" tap

---

## Step 4 — Court Position

```
Step 4 of 5

What's your role on the court?
This helps Que Masters balance teams.

  ┌─────────────────────────────────┐
  │  🏸  Front Player               │  ← Chip card, full width
  └─────────────────────────────────┘
  ┌─────────────────────────────────┐
  │  🏸  Back Player                │
  └─────────────────────────────────┘
  ┌─────────────────────────────────┐
  │  🏸  All-Around Player          │
  └─────────────────────────────────┘

  ⚠ Please select your court position.
```

### Chip card spec

- Width: 100%
- Height: 56px
- Layout: horizontal flex — 24px icon left, label center-left, no trailing icon
- Background (default): `color-bg-surface`
- Border (default): 1px solid `color-border`
- Background (selected): `color-accent-subtle`
- Border (selected): 1.5px solid `color-accent`
- Left accent stripe (selected): 3px solid `color-accent` on left edge
- Border radius: `radius-lg` (14px)
- Text: `text-body`, `color-text-primary` (default) / `color-accent` (selected)
- Gap between chips: `space-3` (12px)
- Only one chip can be selected at a time; tapping a selected chip deselects it

### Options

| Label | Internal value |
|-------|----------------|
| Front Player | `front` |
| Back Player | `back` |
| All-Around Player | `all_around` |

---

## Step 5 — Tournament Wins Last Year

```
Step 5 of 5

Any tournament wins in the past year?
Self-reported — this is shown on your public profile.

  ┌─────────────────────────────────┐
  │  No wins                        │
  └─────────────────────────────────┘
  ┌─────────────────────────────────┐
  │  1–3 tournament wins            │
  └─────────────────────────────────┘
  ┌─────────────────────────────────┐
  │  4 or more wins                 │
  └─────────────────────────────────┘

  ⚠ Please make a selection.
```

### Spec

Same chip card component as Step 4.

| Label | Internal value |
|-------|----------------|
| No wins | `none` |
| 1–3 tournament wins | `1_to_3` |
| 4 or more wins | `4_plus` |

Supporting copy below the chip group (`text-small`, `color-text-secondary`, top margin `space-3`):
`"You can update this anytime from your profile settings."`

---

## States

### Loading (on "Finish")

When the player taps "Finish" on Step 5:
- "Finish" button enters loading state: label replaced by 20px white spinner, button non-interactive
- Footer is locked (Back button also non-interactive)
- No full-screen overlay

### Error (API failure)

If the submission API call fails:
- Toast slides in from top: `color-bg-overlay`, `radius-lg`, `shadow-modal`
- Copy: "Something went wrong. Please try again."
- Auto-dismisses after 4 seconds
- "Finish" button returns to active state
- No data is partially saved

### Success

On `200 OK` from the server, the app navigates to `/home` with a fade-in transition. No success screen is shown within the wizard.

---

## Back Navigation

- Tapping "Back" on steps 2–5 returns to the previous step
- All entered values are preserved in wizard state (client-side) during back navigation
- The progress dots update to reflect the current step
- Hardware back gesture (Android) behaves identically to the Back button

---

## Responsive Layout

| Breakpoint | Behaviour |
|-----------|-----------|
| Mobile (< 768px) | Default layout described above |
| Tablet (768px–1023px) | Same as mobile; card max-width 480px centered |
| Desktop (≥ 1024px) | Two-column split: left brand panel (same as login); right panel contains wizard card at 480px max-width |

On desktop, the wizard card uses `shadow-modal` and sits within the right panel's white space, matching the login screen's desktop treatment.

---

## Design Tokens Reference

| Token | Usage in this view |
|-------|--------------------|
| `color-bg-base` `#0B0B0C` | Page background |
| `color-bg-surface` `#1A1A1D` | Chip card default background |
| `color-bg-elevated` `#2A2A2E` | Text input, picker background |
| `color-accent` `#00FF88` | Active dots, selected chip border/text, Next button bg |
| `color-accent-dim` `#00CC6A` | Completed dots, Next button pressed state |
| `color-accent-subtle` `#00FF8820` | Selected chip background tint |
| `color-error` `#FF4D4D` | Input error borders, inline error text |
| `color-border` `#2A2A2E` | Chip default border, input default border |
| `color-border-strong` `#404048` | Input focus ring |
| `shadow-accent` | Next/Finish button glow |
| `shadow-modal` | Desktop wizard card |
| `radius-md` 10px | Inputs, buttons, "Less than 1 year" chip |
| `radius-lg` 14px | Chip cards |
| `text-display` 28px Bold | Wordmark |
| `text-title` 22px SemiBold | Step headline |
| `text-body` 15px | Step supporting copy, chip labels |
| `text-small` 13px | Step counter, error messages, helper text |
| `text-label` 12px Medium | Button labels (uppercase) |
