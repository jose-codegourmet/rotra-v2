# View: EXP Ledger

## Purpose
A private chronological log of every EXP transaction for the player. Shows each action that earned or reversed EXP, with the match or session reference and a running total. Only visible to the player themselves.

## Route
`/profile/exp-ledger` — authenticated, own account only

## Roles
**Player**, **Que Master**, **Club Owner** — each viewing their own ledger.

---

## Layout
Full-screen scrollable page with a header and a summary stats strip at the top, followed by a transaction list.

```
┌──────────────────────────────────────┐
│  ← Back           EXP Log            │  ← Header
├──────────────────────────────────────┤
│                                      │
│  ┌──────────────────────────────┐    │  ← Summary card
│  │  Total EXP                   │    │
│  │       620                    │    │  ← Large EXP value
│  │  🟩 Warrior 2                │    │  ← Current tier
│  │  Next tier: Warrior 3 at 900 │    │  ← Progress to next
│  │  ████████░░░░░  69%          │    │  ← Progress bar
│  └──────────────────────────────┘    │
│                                      │
│  ── Transactions ─────────────────   │
│                                      │
│  ┌────────────────────────────────┐  │  ← Transaction row (positive)
│  │  Match played        +10 EXP   │  │
│  │  Sunrise BC · Mar 22           │  │
│  │                    Total: 620  │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │  ← Transaction row (positive)
│  │  Match won           +15 EXP   │  │
│  │  Sunrise BC · Mar 22           │  │
│  │                    Total: 610  │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │  ← Transaction row (negative)
│  │  Match voided        -10 EXP   │  │
│  │  Metro BC · Mar 18             │  │
│  │                    Total: 595  │  │
│  └────────────────────────────────┘  │
│                                      │
│  [ Load more... ]                    │  ← Pagination trigger
│                                      │
└──────────────────────────────────────┘
│  [Home] [Clubs] [Sessions] [Profile] [🔔] │
```

---

## Components

### Header Bar
- Left: back arrow → `/profile`
- Title: `EXP Log` — `text-heading`, centered
- Background: `color-bg-base`, border-bottom: 1px solid `color-border`
- Height: 56px

### Summary Card
- Background: `color-bg-surface`
- Border: 1px solid `color-border`
- Border radius: `radius-lg` (14px)
- Padding: `space-6` (24px)
- Shadow: `shadow-card`
- Margin: `space-4` horizontal, `space-5` top

**Card contents:**
- Label: `Total EXP` — `text-small`, `color-text-secondary`, uppercase
- EXP value: `text-display` (28px, Bold), `color-accent` — the current total
- Tier badge row: tier color dot (10px) + tier name (`text-title`, `color-text-primary`) + optional EXP sub-label
- Next tier progress row:
  - Text: `Next tier: [Tier Name] at [N] EXP` — `text-small`, `color-text-secondary`
  - Progress bar: 4px height, full width, `color-bg-elevated` track, `color-accent` fill
    - Fill % = `(current_EXP - current_tier_min) / (next_tier_min - current_tier_min) × 100`
  - % label: `text-micro`, `color-text-secondary`, right-aligned below bar
- If at max EXP-based tier (Titan 5): progress section replaced with `Apex eligibility active — position-based ranking applies.` — `text-small`, `color-accent`

### Transaction List
- Section header: `Transactions` — `text-small`, `color-text-secondary`, uppercase
- Each entry: a lightly bordered row (not a card — rows use dividers)

**Transaction Row:**
- Height: 72px
- Background: `color-bg-surface`
- Border-bottom: 1px solid `color-border`
- Padding: `space-4` horizontal, `space-3` vertical

**Row layout:**
- Left: action icon (20px stroke, `color-accent` for positive, `color-error` for negative/reversal)
- Center (flex column):
  - Action label: `text-body` (15px), `color-text-primary` — e.g. `Match played`, `Review submitted`, `First match (one-time)`, `Match voided`
  - Reference: `text-small`, `color-text-secondary` — club name + date — e.g. `Sunrise BC · Mar 22`
- Right (flex column, right-aligned):
  - EXP delta: `text-body`, Bold
    - Positive: `+[N] EXP`, `color-accent`
    - Negative: `-[N] EXP`, `color-error`
  - Running total: `Total: [N]` — `text-micro`, `color-text-disabled`

**Action label examples (from EXP earning table):**
- `Match played` (+10)
- `Match won` (+15)
- `Review submitted` (+5)
- `Session attended` (+5)
- `Profile completed` (+20, one-time)
- `First match` (+25, one-time)
- `Umpire — score submitted` (+8)
- `Received high rating` (+5, per opponent)
- `Match voided (reversal)` (-10 or -15)

### Load More
- `text-small`, `color-accent`, centered, tappable
- Loads next 20 transactions
- Replaced by `All transactions loaded` — `text-small`, `color-text-disabled` when exhausted

---

## States

### Default
Transactions listed newest first.

### Empty
No transactions yet (brand new account):
- Summary card still shown (0 EXP, Cadet 1)
- Transaction list shows: `No EXP earned yet. Play your first match to get started.` — `text-body`, `color-text-secondary`, centered

### Loading (initial)
- Summary card shows skeleton blocks
- 5 skeleton transaction rows

---

## Responsive Layout

### Breakpoints
| Breakpoint | Layout change |
|-----------|--------------|
| Mobile < 768px | Single column, summary card + transaction list |
| Tablet 768–1023px | `max-width: 600px`, centered |
| Desktop ≥ 1024px | Two-column: summary + stats left, transaction list right |

### Desktop (≥ 1024px)

```
┌────────────┬──────────────────────────┬──────────────────────┐
│  Sidebar   │  LEFT COLUMN  (~35%)     │  RIGHT COLUMN (~65%) │
│            │                          │                      │
│            │  ┌──────────────────┐    │  ── Transactions ──  │
│            │  │  Total EXP       │    │                      │
│            │  │     620          │    │  Match played  +10   │
│            │  │  🟩 Warrior 2    │    │  Sunrise BC · Mar 22 │
│            │  │  Next: W3 at 900 │    │  ─────────────────── │
│            │  │  ████░  69%      │    │  Match won     +15   │
│            │  └──────────────────┘    │  ...                 │
│            │                          │                      │
│            │  ── EXP Breakdown ─────  │                      │
│            │  Matches:     +420 EXP   │                      │
│            │  Reviews:     +50 EXP    │                      │
│            │  Sessions:    +100 EXP   │                      │
│            │  Milestones:  +50 EXP    │                      │
└────────────┴──────────────────────────┴──────────────────────┘
```

- **Left column** (~35%): sticky summary card + an EXP Breakdown summary (aggregate by action category — Matches, Reviews, Sessions, Milestones, Bonuses, Reversals); this is a desktop-only enhancement
- **Right column** (~65%): the full transaction list with its own scroll
- **EXP Breakdown section** (desktop-only, left column below summary card):
  - Each row: category label (`text-small`, `color-text-secondary`) + total EXP (`text-body`, `color-text-primary`)
  - Reversals shown in `color-error` with negative value
- **Transaction rows on desktop**: include an additional `Match/Session ID` reference as a tappable link (→ navigates to that session if still accessible)
- **Content max-width**: `1000px`

### Tablet (768–1023px)
- Single column, `max-width: 600px`

---

## Design Tokens
| Token | Usage |
|-------|-------|
| `color-bg-base` | Page background |
| `color-bg-surface` | Summary card, transaction rows |
| `color-bg-elevated` | Progress bar track |
| `color-accent` | Total EXP value, positive delta, progress bar fill |
| `color-error` | Negative delta (voided match) |
| `color-border` | Card border, row dividers |
| `color-text-primary` | Action label |
| `color-text-secondary` | Reference text, next tier label |
| `color-text-disabled` | Running total, "load more" exhausted |
| `text-display` 28px Bold | Total EXP value |
| `text-title` 22px SemiBold | Current tier name |
| `text-body` 15px | Action label, EXP delta |
| `text-small` 13px | Reference, next tier text, section header |
| `text-micro` 10px | Running total, progress % |
| `radius-lg` 14px | Summary card |
| `shadow-card` | Summary card shadow |
