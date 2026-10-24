# View: Que Master Console

## Purpose
The session host's management interface for an Active Que Session. Full control over courts, the Match Queue, **Automatic Queueing**, player roster, match requests, collections, financials, Session Feed, and session lifecycle. Designed for fast, one-handed interaction. All data is real-time via WebSocket.

> **Canonical rules:** [`../../../business_logic/client_app/08_queue_session.md`](../../../business_logic/client_app/08_queue_session.md) §19 Session Host Interface.

## Route
`/sessions/:id/manage` — assigned Que Masters and Club Owner only

## Roles
**Que Master** (primary), **Club Owner** (full access + Que Master assignment).

**Before Active:** same route shows Lobby management view (roster, pending requests, settings) with **Start Session** CTA.

### Pre-Active dashboard affordances

When the session is `open` but not yet `active`:

| Condition | Dashboard (`/dashboard`) | Navbar / sidebar LIVE strip |
|-----------|------------------------|----------------------------|
| `dateTime > now` (scheduled) | `QuickSessionButton` **`scheduled`** variant — tap opens session Lobby. No Active Session Banner. | **Hidden** — QM is enrolled but not in a current session |
| `dateTime <= now` (start time reached) | `QuickSessionButton` **`resume`** variant + Active Session Banner (`IN QUEUE`) | **Hidden** until host taps **Start Session** |
| DB status `active` | `resume` variant + banner (`LIVE`) | **Visible** — pulsing LIVE strip |

The LIVE strip appears only after the session transitions to DB `active` (host taps **Start Session** from this console). Scheduling a future Quick Session must never show LIVE indicators on the dashboard or in chrome.

See [`../common/session_discovery_dashboard.md`](../common/session_discovery_dashboard.md) § Active-Session Guard — Date/Time Gate.

### Pre-Active Lobby layout (`status: open`)

Implemented at `/find-sessions/:id` when `isOwner` and session is not yet `active`. No operational tab bar.

```
┌──────────────────────────────────────────────────────────┐
│  FUERZA FRIDAY                              [ Close ]    │
│  Cebu Sports Center  ·  Fri, Jul 4  ·  Starts in 4d    │
├──────────────────────────────────────────────────────────┤
│  CAPACITY          8 / 16 accepted                       │
│  ████████░░░░░░░░                                        │
├──────────────────────────────────────────────────────────┤
│  ROSTER (8)                                              │
│  Jose Adrian · not arrived                               │
│  …                                                       │
├──────────────────────────────────────────────────────────┤
│              [ START SESSION ]                           │  ← primary CTA
└──────────────────────────────────────────────────────────┘
```

- **Start Session** transitions DB `open` → `active`; page re-renders into Active console tabs.
- **Close** uses existing close-session flow (host only).
- No courts, queue, or LIVE badges in this state.

---

## Layout
Full-screen page with a top header and a 3-tab console below. Persistent offline banner when disconnected. No standard bottom nav bar replacement on this screen — the bottom area is used by tab-specific sticky action bars.

```
┌──────────────────────────────────────┐
│  [≡] Hall B  ·  Mar 29    [ CLOSE SESSION ]│ ← Header
├──────────────────────────────────────┤
│  ⚠ OFFLINE – Reconnecting...         │  ← Offline banner (conditional)
├──────────────────────────────────────┤
│  COURTS  │  QUEUE  │  PLAYERS         │  ← Tab bar
├──────────────────────────────────────┤
│                                      │
│  [Active tab content]                │
│                                      │
└──────────────────────────────────────┘
```

---

## Components

### Header Bar
- Left: hamburger / session menu icon → bottom sheet: **Edit Session**, **Financials**, **Feed / Announce**, **Settings**
- Center: `[Session title or Venue] · [Day, Date]`
- Right: `CLOSE SESSION` — destructive outline → Close Session + Cost Summary modal
- Background: `color-bg-base`
- Height: 56px

### Offline Banner
Same spec as in Player Session View — `color-warning`, slides in from top on disconnect.

### Tab Bar
- **Active session:** **OVERVIEW** · **COURTS** · **QUEUE** · **PLAYERS** · **REQUESTS** · **COLLECTIONS** · **FEED**
- **Financials** accessible via header menu (or Overview sub-panel) — markup/profit visible here
- Desktop ≥1280px: Courts + Queue + Players visible simultaneously; Requests/Collections as side panels
- `text-label` uppercase, 44px height; scrollable on mobile

---

## Tab 1: Courts

Card grid of all courts. Full-width stack on mobile.

```
│  ┌────────────────────────────────┐  │  ← Active court card
│  │  COURT 1          ⏱ 14 min     │  │  ← Court name + elapsed
│  │  TEAM A           TEAM B       │  │
│  │  Alex · Maria  vs Jose · Ana   │  │
│  │        18      •     15        │  │  ← Live score
│  │  [ SCORE OVERRIDE ]  [ END MATCH ] │  ← Actions
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │  ← Empty court card
│  │  COURT 2          ○ EMPTY      │  │
│  │  [ + ADD MATCH ]               │  │  ← CTA
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │  ← Quick Umpire notice
│  │  COURT 1 · Quick Umpire Active │  │  (badge on court card)
│  │  Jose B. is scoring            │  │
│  └────────────────────────────────┘  │
```

### Active Court Card
- Background: `color-bg-surface`
- Left stripe: 3px `color-accent`
- Border: 1px solid `color-border`, `radius-lg`
- Padding: `space-4`
- Header row: court name (`text-heading`, `color-text-primary`) + elapsed time (`text-small`, `color-text-secondary`, stopwatch icon)
- Smart monitoring alert (conditional): if score reaches threshold — amber banner inside card: `⚡ Match point approaching — prepare next match` — `text-small`, `color-warning`
- Team layout: two columns, player names + avatars (28×28px)
- Score: `text-display` (28px, Bold) centered per team; leading score in `color-accent`
- Set tracker: `Set [N] · [N]-[N]` — `text-small`, `color-text-secondary`
- Actions row (2 buttons, equal width):
  - `SCORE OVERRIDE` — secondary outline, `color-text-secondary` — tap → Score Override modal
  - `END MATCH` — primary `color-accent` — tap → End Match confirm modal
- Quick Umpire badge (conditional on card if active): `QU ACTIVE` pill, `color-accent-subtle`, `color-accent` text; tap → Quick Umpire Token modal

### Empty Court Card
- Background: `color-bg-surface`, dashed `color-border` border, `radius-lg`
- `EMPTY` badge: `color-bg-elevated`, `color-text-disabled`
- `+ ADD MATCH` button: primary `color-accent`, centered, 40px height
- Tap → navigates to `/sessions/:id/add-match` (Que Master Add Match view)

---

## Tab 2: Queue

Horizontally scrollable list of upcoming queued matches. Drag to reorder; swipe to delete.

```
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  →  scroll
│  │ NEXT    │  │  #2     │  │  #3     │
│  │Court 1  │  │         │  │         │
│  │Alex+    │  │Ben+     │  │Leo+     │
│  │Maria    │  │Carlo    │  │Kim      │
│  │   vs    │  │  vs     │  │  vs     │
│  │Jose+    │  │Lisa+    │  │Tina+    │
│  │Ana      │  │May      │  │Ray      │
│  │Est: now │  │Est:15m  │  │Est:30m  │
│  └─────────┘  └─────────┘  └─────────┘
```

### Queue Match Card
- Size: 160px wide × auto height
- Background: `color-bg-surface`, `radius-lg`, border: 1px solid `color-border`
- Padding: `space-4`
- Position badge: `NEXT` (first card, `color-accent`) or `#[N]` (`color-text-disabled`)
- Court assignment (first card only): `Court [N]` — `text-small`, `color-accent`
- Team A names + `vs` + Team B names: `text-small`, `color-text-primary`; `vs` in `color-text-secondary`
- Estimated time: `text-micro`, `color-text-secondary`

**Gestures:**
- Drag handle (right side of card, `≡` icon) → drag-and-drop reorder with spring animation (`motion-spring`, 400ms)
- Swipe left → red delete zone appears → release to confirm delete → triggers Delete Match confirm modal
- Tap card → Edit Match Teams modal

### Empty Queue
`text-body`, `color-text-secondary`, centered: `No matches queued. Add a match from the Courts tab.`

---

## Automatic Queueing Panel

Shown when **Automatic Queueing** is enabled on the session. Canonical rules: [`../../../business_logic/client_app/automatic_queueing.md`](../../../business_logic/client_app/automatic_queueing.md).

**Placement:** Sticky panel above the Queue tab content, or dedicated sub-section within the **QUEUE** tab when a candidate is ready. On desktop, may appear as a right-side panel alongside the queue list.

```
│  ┌────────────────────────────────────────────────────────────┐
│  │  AUTO MATCH — TRAINING STYLE          [ ⚙ Mode ▾ ]        │
│  │  ────────────────────────────────────────────────────────  │
│  │  TEAM A                    TEAM B                          │
│  │  Advanced High + Beginner  Intermediate High + Inter. High │
│  │                                                            │
│  │  Predicted: 47% / 53%    Confidence: High                  │
│  │  Suitability: 89 / 100   Intensity: High                   │
│  │  Carrier burden: Acceptable   Variety: Excellent           │
│  │                                                            │
│  │  Team A Favored ─── Balanced ─── Team B Favored            │
│  │                           ▲ 47/53                          │
│  │                                                            │
│  │  Why this match?                                           │
│  │  • Jose has waited the longest.                            │
│  │  • Anna is due for a developmental match.                  │
│  │  • No partnership repeated from previous two matches.      │
│  │                                                            │
│  │  [ APPROVE ] [ REGENERATE ] [ ALTERNATIVES ] [ MANUAL ]    │
│  └────────────────────────────────────────────────────────────┘
```

### Automatic Match Card

| Element | Spec |
| ------- | ---- |
| Mode label | `AUTO MATCH — [MODE]` — `text-label`, uppercase; Training/Overload use `color-warning` tint |
| Teams | Player names + temporary skill level chips; Effective Strength as subtle numeric badge (QM only) |
| Predicted balance | `47% / 53%` — `text-body`; paired with confidence pill: High / Medium / Low |
| Match Suitability Score | `89 / 100` — progress bar + numeric |
| Intensity | Qualitative label: Low / Moderate / High |
| Carrier burden | Acceptable / Elevated / Warning |
| Player variety | Poor / Fair / Good / Excellent |
| Warnings | Amber badges: Repetition, Low confidence, Carry burden, Fatigue, Queue starvation |
| Balance meter | Horizontal scale with marker; text label required (not color-only) |
| Explanation | Bulleted list — `text-small`, `color-text-secondary` |

### Que Master actions

| Action | Behavior |
| ------ | -------- |
| **Approve Match** | Validates freshness → adds to Match Queue (or marks approved if Assist mode) |
| **Add to Match Queue** | Explicit queue placement after review |
| **Regenerate** | New candidate; respects locked Players/teams |
| **View Alternatives** | Bottom sheet or side panel with 3–5 ranked alternatives |
| **Swap Player** | Inline picker from eligible Player Pool |
| **Lock Player** | Pin Player in next regeneration |
| **Lock Team** | Pin team pairing while searching opponents |
| **Change Mode** | Next-match override selector |
| **Override Warning** | Requires confirmation for high-risk overrides |
| **Reject Candidate** | Discard with optional reason (audit) |
| **Pause Automatic Queueing** | Session-level pause; Manual Queueing still available |
| **Switch to Manual** | Opens Add Match interface |

### UI states

| State | Display |
| ----- | ------- |
| Disabled | Panel hidden; `+ ADD MATCH` only |
| Paused | Banner: `Automatic Queueing paused` + Resume |
| Generating | Skeleton card + `Finding best match…` |
| Candidate ready | Full card (above) |
| No quality candidate | `No ideal match available` + show best alternatives + compromise reasons |
| Candidate stale | `Player status changed — review updated match` + Regenerate CTA |
| Backend error | Error banner + retry |

### Alternatives sheet

Each alternative row: suitability score, teams, predicted balance, top warning, tap to preview full explanation. Primary action: **Use this match**.

---

## Tab 3: Players

Roster of all session participants. Shows arrival/payment status. QM can manage each player.

```
│  Search players...  [ 🔍 ]           │
│  12 accepted  ·  2 waitlisted        │  ← Counts
│                                      │
│  ┌─────────────────────────────────┐ │
│  │ [av] Alex Santos  I Am Prepared  │ │  ← Name + status
│  │      Waiting: 25 min            │ │  ← Wait time
│  │      Fee: ₱120  ● PAID          │ │  ← Payment status
│  │                          [ › ] │ │  ← Tap to expand
│  └─────────────────────────────────┘ │
│  ┌─────────────────────────────────┐ │
│  │ [av] Maria Cruz   Playing       │ │
│  │      In session 2 matches       │ │
│  │      Fee: ₱120  ◑ PARTIAL      │ │  ← Partial payment
│  └─────────────────────────────────┘ │
│  ── WAITLISTED ─────────────────── │
│  ┌─────────────────────────────────┐ │
│  │ [av] Ben Torres   Waitlisted #1  │ │
│  └─────────────────────────────────┘ │
```

### Player Row
- Height: 72px
- Avatar (36×36px, `radius-full`) + name (`text-body`, `color-text-primary`) + status badge
- Wait time: `text-small`, `color-text-secondary`
- Payment badge:
  - `PAID` → `color-accent-subtle` bg, `color-accent` text
  - `UNPAID` → `color-bg-elevated`, `color-text-secondary`
  - `PARTIAL` → `color-warning` tint, `color-warning` text
- Tap row → expands to action sheet with options:
  - Change status (set player to any status)
  - Mark Paid
  - Mark Partial Payment → Mark Partial Payment modal
  - Early Exit → Early Exit confirm modal
  - View Profile

**Waitlisted section:** separated by a divider + `WAITLISTED` section label

**Pending approval section:** when admission mode = approval required — approve/decline actions per row.

**Club Owner only:** Que Master assignment chip row at top of Players or Settings tab.

---

## Tab: Requests

Stacked list of player **Request a Match** proposals (newest first).

- Row: requester, proposed lineup, format, status badge (`Pending`, `Approved`, etc.)
- Actions per row: **Approve**, **Modify & Approve** (opens lineup editor), **Decline**
- Repeated-lineup warning banner (advisory) when setting enabled
- Approve → host places in Match Queue at chosen position (normal queue rules)
- Empty: `No match requests yet.`

---

## Tab: Collections

Fast payment tracking — one row per financially obligated player.

- Columns: Player, Owed, Paid, Balance, Status, Method, Recorded by/time
- Quick actions: **Mark Paid** (one tap + confirm), **Mark Unpaid**, **Record Partial**
- Filter chips: All · Unpaid · Partial · Paid
- Tap row → detail sheet with payment audit history
- Cannot edit after session **Completed**

---

## Tab: Feed

Session Feed management and history.

- Chronological list (same as player view) plus **New Announcement** FAB
- Announcement composer: title + rich-text body (sanitized)
- Field-change entries: read-only facts; editable announcements show **Edited** + history
- Hard delete: **TBD** — prefer edit with history

---

## Financials (menu / Overview panel)

Host-only cost summary:

- Court cost, planned/actual shuttle cost, other costs, markup
- Estimated vs final totals, collected, outstanding, profit/markup line
- **Not visible to regular Players**
- Estimation formulas: display only — calculation **TBD**

---

## Modals

### End Match Confirm Modal
Triggered by `END MATCH` button on a court card.

- Title: `End Match on Court [N]?` — `text-title`
- Body: `Final score: Team A [X] – Team B [Y]` (auto-filled from current score if umpire is active) — `text-body`, `color-text-secondary`
- Note: `Players will be prompted to submit their reviews.` — `text-small`, `color-text-secondary`
- Actions:
  - Primary: `END MATCH` — `color-accent`
  - Secondary: `Cancel` — outline

### Score Override / Void Modal
Triggered by `SCORE OVERRIDE` on a court card.

- Title: `Override Score for Court [N]` — `text-title`
- Two options presented as radio cards:
  - **Override**: `Enter corrected score` — shows two number inputs (Team A / Team B), 56px height each
  - **Void Match**: `Void match` — radio option (reverses EXP/MMR per rules); never label "unscored"
- Required: `Reason for override` — textarea, 150 char max
- Note: `text-micro`, `color-text-disabled`: `This action is logged with your identity.`
- Actions:
  - Primary: `APPLY OVERRIDE` — `color-accent`
  - Secondary: `Cancel` — outline

### Quick Umpire Token Modal
Triggered by QU badge on a court card, or from the match detail action.

- Title: `Quick Umpire — Court [N]` — `text-title`
- QR code: 200×200px, white on `color-bg-elevated`, `radius-md`, centered
- Below QR: shareable URL — `text-small`, `color-text-secondary`, monospace-style
- Buttons:
  - `COPY LINK` — secondary outline, full-width
  - `REGENERATE TOKEN` — secondary outline, full-width; tap → Regenerate confirm inline (text: "This will invalidate the current token.")
- Status indicator: `Active` (pulsing green dot) or `Claimed` (grey dot + name of claimer)
- Close button top-right

### Mark Partial Payment Modal
Triggered from player row action sheet.

- Title: `Partial Payment — [Player Name]` — `text-title`
- Full fee label: `Full fee: ₱[amount]` — `text-small`, `color-text-secondary`
- Amount paid input: currency input (`₱`) — `text-body`, `color-text-primary`, numeric keyboard
- Remaining balance (auto-computed): `Remaining: ₱[amount]` — `text-small`, `color-text-secondary`; turns `color-error` if over-entered
- Actions:
  - Primary: `SAVE PAYMENT` — `color-accent`
  - Secondary: `Cancel` — outline

### Early Exit Confirm Modal
Triggered from player row action sheet → Early Exit.

- Title: `Confirm Early Exit for [Player Name]?` — `text-title`
- Body: `Their slot will be released to the next waitlisted player.` — `text-body`, `color-text-secondary`
- Payment status callout: `Payment status: ₱120 UNPAID` (or current status)
- Checkbox: `I confirm payment has been settled` — must be checked before proceeding
- Actions:
  - Primary: `CONFIRM EXIT` — `color-accent`, disabled until checkbox checked
  - Secondary: `Cancel` — outline

### Close Session + Cost Summary Modal
Triggered by `CLOSE SESSION` in the header.

- Title: `Close Session?` — `text-title`
- **Typed confirmation (required):** label `Type the session name to confirm:` + bold session title; primary action disabled until input matches exactly
- Summary section (`color-bg-elevated`, `radius-lg`, padding `space-4`):
  - Total spent, total collected, outstanding, markup profit — one row each
  - Outstanding in `color-error` if > 0
- Body note: `Players with outstanding fees will be notified.` — `text-small`, `color-text-secondary`
- Matches played count: `X matches completed` — `text-small`
- Actions:
  - Primary: `CLOSE SESSION` — `color-error` background (destructive — this ends the session)
  - Secondary: `Cancel` — outline

---

## Responsive Layout

### Breakpoints
| Breakpoint | Layout change |
|-----------|--------------|
| Mobile < 768px | 3 tabs, single column per tab |
| Tablet 768–1023px | 3 tabs, `max-width: 860px`, centered |
| Desktop ≥ 1024px | All 3 panels visible simultaneously — true dashboard layout |

### Desktop (≥ 1024px)

The QM Console becomes a **full-width operational dashboard** — all three panels visible at once, no tab switching:

```
┌────────────┬─────────────────────────────────────────────────────┐
│  Sidebar   │  [≡] Hall B · Mar 29  ─────────  [ CLOSE SESSION ]  │
│            ├────────────────────────────────────────────────────  │
│            │  ⚠ OFFLINE banner (spans full width, conditional)   │
│            ├──────────────────┬──────────────────┬───────────────┤
│            │  COURTS  (~40%)  │  QUEUE  (~35%)   │ PLAYERS (~25%)│
│            │                  │                  │               │
│            │  ┌────────────┐  │  Match #1        │ Alex S.  PREP │
│            │  │ Court 1    │  │  Alex+Maria vs   │ Maria C. PLAY │
│            │  │ LIVE  14m  │  │  Jose+Ana        │ Jose R.  WAIT │
│            │  │ 18 · 15    │  │  ──────────────  │ ─────────── │
│            │  │[OVERRIDE]  │  │  Match #2        │ WAITLISTED    │
│            │  │[END MATCH] │  │  Ben+Carlo vs    │ Ben T.  #1    │
│            │  └────────────┘  │  Lisa+Kim        │               │
│            │  ┌────────────┐  │  ──────────────  │               │
│            │  │ Court 2    │  │  [ + ADD MATCH ] │               │
│            │  │ EMPTY      │  │                  │               │
│            │  │[ADD MATCH] │  │                  │               │
│            │  └────────────┘  │                  │               │
└────────────┴──────────────────┴──────────────────┴───────────────┘
```

- **Courts panel** (~40%): court cards in a vertical stack; large scores, elapsed time, action buttons all visible
- **Queue panel** (~35%): upcoming matches as a **vertical list** (no horizontal scroll); `+ ADD MATCH` button pinned at bottom of panel; drag-to-reorder stays with drag handle on each row
- **Players panel** (~25%): scrollable player roster; search input at top; tap row to expand inline (no separate sheet)
- **Tab bar**: hidden on desktop — all panels always visible
- **Header bar**: spans full width above the 3-panel split; `CLOSE SESSION` button top-right
- Each panel has a sticky label header + its own internal scroll if content overflows
- **Content max-width**: full-width (fills the main area after sidebar)

**Queue cards on desktop (vertical list):**
- Full-width row format: `#[N]` rank + Team A vs Team B names + estimated time + drag handle right
- Height: 64px per row
- Swipe-to-delete becomes a `×` icon button on hover (desktop has no swipe)

**Player rows on desktop:**
- Same row format; hover state: `color-bg-elevated` background; row action buttons appear on hover (Mark Paid, Set Status, Exit)

**All modals on desktop:** Centered overlays (`max-width: 520px`), not bottom sheets.

### Tablet (768–1023px)
- Tabs retained; `max-width: 860px`

---

## Design Tokens
| Token | Usage |
|-------|-------|
| `color-bg-base` | Page background |
| `color-bg-surface` | Court cards, queue cards, player rows |
| `color-bg-elevated` | Empty court dashed area, payment modal |
| `color-accent` | Active court stripe, NEXT badge, END MATCH, paid status |
| `color-accent-subtle` | Smart monitoring alert tint, Quick Umpire badge |
| `color-warning` | Offline banner, partial payment, smart monitoring |
| `color-error` | Close Session, score override badge, outstanding |
| `color-text-primary` | Court names, player names, scores |
| `color-text-secondary` | Elapsed time, team names, metadata |
| `text-display` 28px Bold | Live scores |
| `text-heading` 18px SemiBold | Court names |
| `text-body` 15px | Player names, modal body |
| `text-small` 13px | Metadata, wait times |
| `text-micro` 10px | Queue card times, table labels |
| `radius-lg` 14px | Court and queue cards |
| `shadow-card` | Court cards |
| `motion-spring` 400ms | Queue drag-and-drop reorder animation |
