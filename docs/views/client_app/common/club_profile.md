# View: Club Profile

## Purpose
The public-facing page for a club. Visible to all authenticated users — members and non-members alike. Shows the club's identity, member snapshot, and available join actions. This is also the landing page after following an invite link or scanning a QR code.

## Route
`/clubs/:id` — authenticated users only

## Roles
All authenticated roles. The join/action CTA changes based on the user's membership status.

---

## Report to admins (complaints)

**Active members only** may open **Report** from the club profile overflow menu (`⋯`) or a secondary **Report club** text action.

- Opens a modal with **reason** (required, free text) and optional **context**.
- Creates a `complaints` row with `target_type = 'club'` (or `club_owner` when reporting the owner — product choice for separate entry on owner row).
- Optional toast / `complaint_submitted` notification (receipt only; no resolution notification).

See [`../../../database/12_club_governance.md`](../../../database/12_club_governance.md).

---

## Layout
Scrollable single-column page. Top section is a club hero block. Below it: description, stats row, members preview, and sessions list. Sticky bottom action bar for join/request CTA.

```
┌──────────────────────────────────────┐
│  ← Back                   [• • •]   │  ← Header bar (share/options)
├──────────────────────────────────────┤
│                                      │
│  Sunrise Badminton Club              │  ← Club name (text-display)
│  Quezon City                         │  ← Location
│  Active  ·  Est. January 2024       │  ← Status + founded
│                                      │
│  ── ─────────────────────────────    │  ← Divider
│                                      │
│  We're a competitive-social club     │  ← Description
│  focused on doubles rotational       │
│  badminton. Open to all levels.      │
│                                      │
│  ┌────────┐  ┌────────┐  ┌────────┐  │  ← Stats row
│  │   24   │  │   3    │  │  12    │  │
│  │ Members│  │  QMs   │  │Sessions│  │
│  └────────┘  └────────┘  └────────┘  │
│                                      │
│  ── Members ─────────────────────    │  ← Section header
│  [avatar] [avatar] [avatar]  +18     │  ← Avatar strip
│                                      │
│  ── Upcoming Sessions ────────────   │  ← Section header
│  ┌────────────────────────────────┐  │  ← Session card
│  │  Saturday, Apr 5 · 8:00 AM     │  │
│  │  Hall B · 12/16 slots          │  │
│  └────────────────────────────────┘  │
│                                      │
│  Owned by  [avatar]  Jose Buctuanon  │  ← Owner attribution
│                                      │
└──────────────────────────────────────┘
├──────────────────────────────────────┤  ← Sticky bottom action bar
│         [ REQUEST TO JOIN ]          │  ← Primary CTA
└──────────────────────────────────────┘
│  [Home] [Clubs] [Sessions] [Profile] [🔔] │
```

---

## Components

### Header Bar
- Left: back arrow (icon button)
- Right: overflow menu icon (`···`) — triggers Share Sheet modal; future: report
- Title: none (club name is in the hero)
- Background: `color-bg-base`, border-bottom: 1px solid `color-border`
- Height: 56px

### Club Hero Block
- Club name: `text-display` (28px, Bold), `color-text-primary`
- Location: `text-body` (15px), `color-text-secondary` — with map pin icon (16px, stroke)
- Status + founded: `text-small`, `color-text-secondary` — `Active · Est. January 2024`
  - Status badge inline: `Active` = `color-accent-subtle` bg + `color-accent` text pill; `Paused` = `color-bg-elevated` + `color-text-secondary`
- Padding: `space-5` horizontal, `space-8` top

### Description
- `text-body` (15px, Regular), `color-text-secondary`
- "Read more" expander if description is > 4 lines
- Padding: `space-5` horizontal

### Stats Row
- 3 stat tiles in a horizontal row, equal-width
- Each tile:
  - Value: `text-title` (22px, SemiBold), `color-text-primary`
  - Label: `text-small`, `color-text-secondary`, uppercase
- Stats: **Members** (total active), **Que Masters** (count), **Sessions** (all-time completed count)
- Background: `color-bg-surface`, border: 1px solid `color-border`, `radius-lg`
- Padding: `space-4`

### Members Preview Strip
- Section header: `Members` — `text-small`, `color-text-secondary`, uppercase
- Row of 5 avatar circles (36×36px, `radius-full`, 2px `color-bg-elevated` border)
  - Fallback: initials on `color-bg-elevated`
  - Overlapping layout: each avatar overlaps the previous by 8px
- Overflow count: `+N` label in same circle style (`color-text-secondary`, `color-bg-elevated` background)
- Tap anywhere on strip → no action in MVP (future: member list)

### Upcoming Sessions Preview
- Section header: `Upcoming Sessions`
- Up to 3 upcoming open sessions listed as compact cards
  - Date + time: `text-body`, `color-text-primary`
  - Venue + slot count: `text-small`, `color-text-secondary`
  - Slot count colour: green (`color-accent`) if slots available, muted (`color-text-disabled`) if full
- If user is already a member: tap card → `/sessions/:id`
- If not a member: tap card does nothing (joining club is required first)
- "No upcoming sessions" placeholder if empty: `text-small`, `color-text-disabled`

### Club Owner Attribution
- Row at bottom of content: avatar (24×24px) + display name
- `text-small`, `color-text-secondary` — `Owned by [name]`
- Tap → navigates to owner's `/profile/:id`

### Sticky Bottom Action Bar
- Background: `color-bg-surface`
- Border-top: 1px solid `color-border`
- Padding: `space-4`
- CTA button is full-width, 48px, `radius-md`

**CTA states by membership status:**
| Status | Button Label | Style |
|--------|-------------|-------|
| Not a member, Auto-Approve ON | `JOIN CLUB` | Primary (`color-accent`) |
| Not a member, Auto-Approve OFF | `REQUEST TO JOIN` | Primary (`color-accent`) |
| Pending request | `REQUEST SENT` | Disabled, `color-text-disabled` |
| Active member | `MANAGE` (Club Owner) or `VIEW SESSIONS` (Player/QM) | Secondary outline |
| Invite via link | `ACCEPT INVITE` | Primary (`color-accent`) |

---

## States

### Non-Member View
Standard layout with join/request CTA.

### Member View
CTA changes to role-appropriate action. Session cards are tappable.

### Invite Link Entry (arriving from invite link)
- A banner at top of page (below header): "You've been invited to join [Club Name]." — `color-accent-subtle` bg, `color-accent` border-left
- CTA: `ACCEPT INVITE`

### Disabled Invite Link
- Banner: `This invite link is no longer active.` — `color-warning` bg, `color-warning` border-left
- No CTA visible (join options suppressed)

### Blacklisted Player
- No error visible — all join CTAs are hidden; `LEARN MORE` / contact text not shown (silent block per business rules)
- Standard view shown with no action available

---

## Modals

### Confirm Request to Join Modal
Triggered when non-member taps `REQUEST TO JOIN`.

- Background: `color-bg-surface`, `radius-xl`, `shadow-modal`
- Backdrop: `rgba(0,0,0,0.6)`
- Club avatar/icon + title: `Join [Club Name]?` — `text-title`, `color-text-primary`
- Body copy: `Your profile will be shared with the Club Owner for review. You'll be notified when your request is processed.` — `text-body`, `color-text-secondary`
- Actions:
  - Primary: `SEND REQUEST` — `color-accent` full-width button
  - Secondary: `Cancel` — outline button
- If Auto-Approve is ON, title changes to: `Join [Club Name]?` and body: `You'll be added as a member immediately.`

### Accept/Decline Direct Invite Modal
Triggered when player taps `ACCEPT INVITE` from banner or notification deep link.

- Title: `You've been invited to join [Club Name]` — `text-title`, `color-text-primary`
- Body: Club description snippet + member count — `text-body`, `color-text-secondary`
- Actions:
  - Primary: `ACCEPT` — `color-accent` full-width button
  - Secondary (destructive variant): `DECLINE` — `color-error` border, `color-error` text, outline style
- On Accept: immediate membership + toast "Welcome to [Club Name]!"
- On Decline: modal closes, CTA area hidden, soft message: "Invite declined."

---

## Responsive Layout

### Breakpoints
| Breakpoint | Layout change |
|-----------|--------------|
| Mobile < 768px | Single column scroll, sticky bottom CTA bar |
| Tablet 768–1023px | Single column, `max-width: 600px`, centered, sticky CTA |
| Desktop ≥ 1024px | Two-column layout; CTA inline, no sticky bar |

### Desktop (≥ 1024px)

```
┌────────────┬──────────────────────┬───────────────────┐
│  Sidebar   │  LEFT COLUMN ~60%    │  RIGHT COLUMN ~40%│
│            │                      │                   │
│            │  Club name           │  ┌─────────────┐  │
│            │  Location            │  │  Stats      │  │
│            │  Status              │  │  Members    │  │
│            │  Description         │  │  ─────────  │  │
│            │                      │  │  CTA Button │  │
│            │  Upcoming Sessions   │  └─────────────┘  │
│            │  [session cards]     │                   │
│            │                      │                   │
│            │  Owner attribution   │                   │
└────────────┴──────────────────────┴───────────────────┘
```

- **Layout**: Two-column within the main content area
  - Left column (~60%): Club hero (name, location, status, description), Upcoming Sessions list, Owner attribution
  - Right column (~40%): Stats row (becomes a vertical stats card), Members avatar strip, **Join/Request CTA button** (no longer sticky at the bottom — inline in the right column as a prominent card)
- **Sticky bottom action bar**: removed on desktop — CTA lives in the right column card instead
  - CTA card: `color-bg-surface`, `radius-lg`, `shadow-card`, `space-6` padding; button full-width within card
- **Stats**: reflows from a 3-across row into a vertical list (label + value per row) within the right sidebar card
- **Modals (desktop)**: Render as centered overlays (`max-width: 480px`, vertically centered) rather than bottom sheets
- Content area max-width: `1100px`

### Tablet (768–1023px)
- Single column, `max-width: 600px`
- Sticky bottom CTA bar stays

---

## Design Tokens
| Token | Usage |
|-------|-------|
| `color-bg-base` | Page background |
| `color-bg-surface` | Stats tiles, session cards, bottom bar, modals |
| `color-bg-elevated` | Avatar fallback, overflow count |
| `color-accent` | Join CTA, active status badge, slot available |
| `color-accent-subtle` | Invite banner background |
| `color-warning` | Disabled link banner |
| `color-error` | Decline button |
| `color-text-primary` | Club name, stat values |
| `color-text-secondary` | Location, description, metadata |
| `text-display` 28px Bold | Club name |
| `text-title` 22px SemiBold | Stat values, modal title |
| `text-body` 15px | Description |
| `text-small` 13px | Metadata, section headers |
| `radius-full` | Avatars |
| `radius-lg` 14px | Cards |
| `shadow-modal` | Modals |
