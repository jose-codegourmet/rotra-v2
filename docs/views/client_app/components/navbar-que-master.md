# Component: Navbar — Que Master

## Purpose
The top navigation bar for the **Que Master** role. Extends the base Player navbar with a **Live Console shortcut** when the QM is actively managing a session. The Sessions tab gains a pulsing `LIVE` badge during an active managed session. On desktop, the QM Console has its own specialized header that fully replaces the standard top bar.

> **Client v1:** Standard pages use the same Player shell notification surfaces as in [`../common/notification_center.md`](../common/notification_center.md) § Implementation status (Client app v1); QM Console header and LIVE session affordances remain spec-only until wired.

> **Desktop-first note:** The sidebar (`sidebar-que-master.md`) is the primary navigation surface at ≥1024px, including the Live Console shortcut. This navbar covers the in-page top bar and mobile/tablet navigation.

## Roles
**Que Master** — assigned by a Club Owner; manages courts, queue, and players during active sessions.

---

## 1. Desktop Top Bar (≥ 1024px)

### Standard pages (non-console)

```
┌────────────────────────────────────────────────────────────────┐
│  [Page Title]                                      [🔔  2]     │
└────────────────────────────────────────────────────────────────┘
```

Same spec as Player top bar (see `navbar-player.md`) with no additional elements in the standard state.

### QM Console page (`/sessions/:id/manage`)

The standard top bar is **entirely replaced** by a full-width console header:

```
┌──────────────────────────────────────────────────────────────────┐
│  [≡]   Hall B  ·  Saturday, Mar 29               [ CLOSE SESSION ]│
└──────────────────────────────────────────────────────────────────┘
```

- **Left:** Hamburger/session menu icon (24px, `color-text-primary`) → bottom sheet: Edit Session, View Cost Summary, Announce to Players
- **Center:** `[Venue]` (`text-body`, `color-text-primary`) + ` · ` + `[Day, Date]` (`text-small`, `color-text-secondary`)
- **Right:** `CLOSE SESSION` — destructive outline button (36px height), `color-error` border + label
- **Background:** `color-bg-base`
- **Height:** 56px

The sidebar (if visible) remains rendered, but the console header spans the full main content area width. See `que_master_console.md` for full console layout spec.

### Page-Specific Variations (non-console)

| Route | Left content | Right |
|-------|-------------|-------|
| `/home` | `Good [time], [First name].` | 🔔 bell |
| `/clubs` | `Clubs` | 🔔 bell |
| `/sessions` | `Sessions` | 🔔 bell |
| `/sessions/:id` | `← Session · [Venue]` | ⓘ info icon |
| `/sessions/:id/manage` | *(Console header — see above)* | *(Console header)* |
| `/profile` | `Profile` | ⚙ settings |
| `/notifications` | `Notifications` | — |

---

## 2. Mobile / Tablet Top Header Bar (< 1024px)

### Default (non-console pages)

```
┌──────────────────────────────────────┐
│  ROTRA                      [🔔  2]  │
└──────────────────────────────────────┘
```

Same base spec as Player navbar.

### QM Console (`/sessions/:id/manage`)

The standard header is **replaced** by the console header (full-width):

```
┌──────────────────────────────────────┐
│  [≡]   Hall B · Mar 29   [CLOSE SESSION]│
└──────────────────────────────────────┘
```

On mobile/tablet the wordmark and notification bell are hidden. The console header takes full ownership of the top bar space.

### Inner Page Variant

```
┌──────────────────────────────────────┐
│  ← Back        Sessions              │
└──────────────────────────────────────┘
```

Standard inner page back navigation — same spec as Player.

---

## 3. Bottom Navigation Bar (Mobile / Tablet only)

### Default state (no active managed session)

```
┌───────────────────────────────────────────────────┐
│  [🏠]    [🏸]    [📋]    [👤]    [🔔]             │
│  Home   Clubs  Sessions Profile  Notif             │
└───────────────────────────────────────────────────┘
```

Identical to Player bottom nav — no additional tabs.

### Active session state (QM is currently managing a **current** session)

> **Date/time gate:** LIVE indicators require a **current** enrollment per [`../common/session_discovery_dashboard.md`](../common/session_discovery_dashboard.md) § Active-Session Guard — Date/Time Gate. Future scheduled sessions do not show the pulse dot or Live Console shortcut. Wire chrome via `useEnrolledSessionState().live` (DB `active`) or `current` as appropriate.

```
┌────────────────────────────────────────────────────────┐
│  [🏠]    [🏸]    [📋 🟢]   [👤]    [🔔]               │
│  Home   Clubs  Sessions  Profile  Notif                │
└────────────────────────────────────────────────────────┘
```

**Sessions tab badge (active session):**
- Small pulsing green dot (8px, `color-accent`, opacity 1→0.4 loop, 1.2s ease-in-out) overlaid top-right of the Sessions icon
- No number — purely a live presence indicator
- Tapping Sessions tab → navigates directly to `/sessions/:id/manage` for the active session (bypassing the session list if exactly one session is active; shows a session picker if managing multiple concurrent sessions)

### QM Console Active (full screen)
When the QM is on the console view (`/sessions/:id/manage`), the standard bottom nav bar is **hidden** — the console uses its own sticky action bars per tab. Bottom nav is restored when navigating away.

### Tabs

| # | Label | Icon | Route | Badge |
|---|-------|------|-------|-------|
| 1 | Home | house | `/home` | — |
| 2 | Clubs | shield | `/clubs` | — |
| 3 | Sessions | calendar | `/sessions` or `/sessions/:id/manage` (if active) | Green pulse dot (if managing) |
| 4 | Profile | user-circle | `/profile` | — |
| 5 | Notif | bell | `/notifications` | Unread count (red `color-error`) |

### Tab Item Spec
- Icon: 20px stroke, centered
- Label: `text-micro` (10px, Medium 500), below icon
- **Active:** icon + label in `color-accent`; 2px top border in `color-accent`
- **Inactive:** icon + label in `color-text-disabled`

---

## 4. Contextual States

### QM Has No Active Sessions
- Standard navbar/bottom nav — identical to Player
- No live indicators shown

### QM Is Managing a Current Session
- Sessions tab shows green pulse dot
- Desktop sidebar shows Live Console shortcut strip (see `sidebar-que-master.md`)
- Bottom nav hidden while on `/sessions/:id/manage`

### QM Is Also a Player in a Session (concurrent state)
A Que Master can be both managing a session and playing in one. If this occurs:
- The active session banner (player context) is **not** shown on home — the Live Console strip takes priority
- Sessions tab tap → console view (management takes priority)

### Console Header — Close Session Button States
| State | Appearance |
|-------|-----------|
| Default | `CLOSE SESSION` — `color-error` border + text, outline |
| Tap | Opens Close Session + Cost Summary modal (see `que_master_console.md`) |
| Session already closed | Button disabled, `color-text-disabled`, label: `SESSION CLOSED` |

---

## 5. Design Tokens

| Token | Usage |
|-------|-------|
| `color-bg-base` | Top header bar background |
| `color-bg-surface` | Bottom nav bar background |
| `color-border` | Bar borders |
| `color-accent` | Active tab, live session dot |
| `color-text-primary` | Wordmark, page title, console venue |
| `color-text-secondary` | Console date/day |
| `color-text-disabled` | Inactive tab icon + label, disabled close button |
| `color-error` | Close Session button border + label |
| `text-title` 22px SemiBold | Wordmark, greeting |
| `text-body` 15px | Console venue label |
| `text-small` 13px | Console date |
| `text-micro` 10px Medium | Tab labels, badge counts |
