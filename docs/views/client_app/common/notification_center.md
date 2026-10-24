# View: Notification Center

## Purpose
The in-app notification inbox. Shows all push and in-app notifications for the authenticated user — session reminders, club events, review prompts, EXP awards, match alerts, club application outcomes, and system messages. Serves as a fallback for users who denied OS push permissions (in-app only in that case).

## Implementation status (Client app v1)

The client app (`apps/client`) ships a **static mock** notification list for shell and page UI until the notifications API and Realtime wiring exist:

- **Route:** `/notifications` — linear list with header title and a non-interactive **Mark all read** label when unread count &gt; 0 (no handler yet). Page: `apps/client/src/app/(protected)/notifications/page.tsx`.
- **Desktop (≥1024px):** `apps/client/src/components/ui/navbar/Navbar.tsx` includes a bell **dropdown** — **5 most recent** rows + **View all** → `/notifications` (module: `apps/client/src/components/modules/notifications/`).
- **Mobile header:** bell **deep-links** to `/notifications` (no dropdown); unread badge on the bell (`MobileHeader.tsx`).
- **Bottom nav & sidebar:** fifth **Notifications** destination with unread badge on the bell tab / row.
- **Not in v1:** Unread / All tabs, date grouping, swipe-to-dismiss, push-permission banner, per-row deep links, **Mark all as read** in the dropdown, and Realtime subscription (spec sections below remain the target).

## Navbar notification dropdown

In addition to this full-page inbox, the **top bar / navbar** (or shell header) exposes a **dropdown** anchored to the bell icon:

- Shows the **5 most recent** notifications (read + unread mixed, newest first).
- **Unread badge** on the bell shows total unread count (driven by server state; client may subscribe via Realtime — see below).
- **Mark all as read** control at the top of the dropdown (same behavior as full page).
- Footer link: **View all** → navigates to `/notifications`.
- **Tap a row:** mark that notification as read (if unread), then **navigate** using `related_entity_type` + `related_entity_id` (same mapping as the full list).

## Realtime (Client app)

Subscribe to `INSERT` on `notifications` filtered by `recipient_id` (see [`../../../database/07_notifications.md`](../../../database/07_notifications.md)) so new items appear without polling; badge count updates immediately.

## Route
`/notifications` — authenticated users only

## Roles
All authenticated roles: **Player**, **Que Master**, **Club Owner**.

---

## Layout
Full-screen scrollable page accessible from the bottom nav notification tab. Header with unread count badge and a "Mark all read" action. Notifications grouped into two tabs: **Unread** and **All**.

```
┌──────────────────────────────────────┐
│  Notifications       [ Mark all read]│  ← Header
├──────────────────────────────────────┤
│  [ UNREAD (3) ] [ ALL ]              │  ← Tab bar
├──────────────────────────────────────┤
│                                      │
│  ── Today ─────────────────────────  │  ← Date group header
│                                      │
│  ┌────────────────────────────────┐  │  ← Notification row (unread)
│  │ ● [🏸]  Your match is complete  │  │  ← Unread dot + icon + title
│  │         Sunrise BC · 2 hrs ago  │  │  ← Source + timestamp
│  │         Submit your reviews now │  │  ← Body copy
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │  ← Notification row (unread)
│  │ ● [🏆]  You've leveled up!      │  │
│  │         Warrior 2 unlocked     │  │
│  │         Mar 29 · 4 hrs ago     │  │
│  └────────────────────────────────┘  │
│                                      │
│  ── Yesterday ──────────────────── │  ← Date group
│                                      │
│  ┌────────────────────────────────┐  │  ← Notification row (read)
│  │   [🏠]  Session starting soon  │  │  ← No unread dot (read)
│  │         Hall B · Mar 28        │  │
│  │         Your session at Hall B │  │
│  │         starts in 1 hour.      │  │
│  └────────────────────────────────┘  │
│                                      │
└──────────────────────────────────────┘
│  [Home] [Clubs] [Sessions] [Profile] [🔔 3] │
```

---

## Components

### Header Bar
- Left: `Notifications` — `text-heading` (18px, SemiBold), left-aligned (no back button — tab root)
- Right: `Mark all read` — `text-small`, `color-accent`, tappable text — marks all unread as read; button hides when unread count = 0
- Background: `color-bg-base`
- Height: 56px

### Tab Bar
- Two tabs: **UNREAD ([N])** · **ALL**
- Unread tab shows live count in label (e.g. `UNREAD (3)`) — count resets to 0 on tab switch + auto mark-as-read
- `text-label` uppercase, 44px height
- Active tab: `color-accent`, 2px bottom border
- Inactive: `color-text-disabled`

### Date Group Header
- Text: `Today` / `Yesterday` / day of week (e.g. `Monday`) for within last 7 days / full date beyond that
- Style: `text-small` (13px), `color-text-secondary`, uppercase
- Thin separator line extending right
- Margin: `space-4` top, `space-3` bottom

### Notification Row
- Height: auto (minimum 72px)
- Background:
  - Unread: `color-bg-surface` with subtle left stripe 2px `color-accent`
  - Read: `color-bg-base` (blends into page background)
- Border-bottom: 1px solid `color-border`
- Padding: `space-4` horizontal, `space-3` vertical

**Row layout:**
- Unread indicator dot: 8px filled circle, `color-accent`, absolute positioned left edge of row; hidden on read
- Category icon: 36×36px circle, `color-bg-elevated`, `radius-full` — contains a 20px stroke icon
  - Icon types by notification category:
    - Session / match: shuttlecock or court icon
    - Review prompt: star icon
    - Club event / application: users or document icon
    - EXP / level-up: lightning bolt / tier badge icon
    - System / account: info circle icon
    - Payment: currency icon
- Content block (flex column):
  - Title: `text-body` (15px, Regular, **Bold** if unread), `color-text-primary`
  - Body copy: `text-small` (13px), `color-text-secondary` — 2 lines max, truncated
  - Source + timestamp: `text-micro` (10px), `color-text-disabled` — e.g. `Sunrise BC · 2 hrs ago`
- Chevron `›` right-aligned: `color-text-disabled`, 16px — indicates deep link

**Tap behavior:** Each row deep-links to the relevant screen based on notification type:
| Notification Type | Deep Link |
|------------------|-----------|
| Review prompt | `/review/:match_id` |
| Session reminder | `/sessions/:id` |
| Match complete | `/sessions/:id` |
| Club join request (QM/Owner) | `/clubs/:id/manage` (Requests tab) |
| Club invite | `/clubs/:id` |
| Que Master assigned | `/clubs/:id` |
| Level-up | `/profile` (EXP ledger) |
| EXP awarded | `/profile/exp-ledger` |
| `club_application_approved` / `club_application_rejected` / SLA reject | `/profile/applications` |
| `club_application_submitted` (receipt) | `/profile/applications` |
| `club_closed` / `club_demotion_completed` | `/clubs/:id` or `/profile/applications` per payload |
| `complaint_submitted` | `/profile` (no resolution follow-up) |
| Payment reminder | `/sessions/:id` |

**Swipe to dismiss:** Swipe left on any row → row slides to reveal red `CLEAR` zone (background `color-error` at 20% opacity, white trash icon + `CLEAR` label). Release to dismiss permanently from list.

### Notification Category Icons (Color by type)
- Session alerts: `color-accent` icon on `color-accent-subtle` background
- Review prompts: `color-warning` icon on `color-warning` tint background
- Club events: `color-text-secondary` icon on `color-bg-elevated` background
- Level-up / EXP: `color-accent` icon on `color-accent-subtle` background
- System / account: `color-text-secondary` on `color-bg-elevated`

---

## Notification Content Examples (per category)

### Session Reminders
- `Your session at Hall B starts in 1 hour.`
- `Your session at Hall B is about to start. Head to the court!`
- `Session cancelled: Metro BC · Apr 2`

### In-Session Alerts
- `You're up next on Court 2. Get ready!`
- `Your match on Court 2 has started.`
- `You've been assigned to umpire the next match on Court 1.`
- `A spot opened up! You're now accepted for today's session.`

### Post-Session
- `Session ended. View the final leaderboard.`
- `2 hours left to submit your match reviews.`
- `You earned +35 EXP from today's session.`

### Club Events
- `[Player name] has requested to join Sunrise BC.` (Club Owner)
- `Your request to join Sunrise BC has been approved.`
- `Sunrise BC has invited you to join.`
- `You've been made a Que Master for Sunrise BC.`
- `[QM Name] has created a new session at Hall B on Apr 5.`

### Review & Rating
- `How was your match? Submit your reviews now.`
- `An opponent rated your performance highly. +5 EXP bonus.`

### System / Account
- `Your club application for Sunrise BC was approved.`
- `Your club application was not approved.` (with reason summary)
- `You've leveled up to Warrior 2!`
- `Your playing level has been adjusted by the system.`

---

## States

### Unread Tab — Has Notifications
Default state described above.

### Unread Tab — Empty (All Read)
- Centered empty state with `space-10` top padding
- Icon: bell outline (48px, `color-text-disabled`)
- Title: `You're all caught up.` — `text-heading`, `color-text-primary`
- Body: `No new notifications.` — `text-body`, `color-text-secondary`

### All Tab — Empty (No Notifications Ever)
- Same empty state but body: `Notifications will appear here once you start playing.`

### Push Notifications Disabled (OS permission denied)
- A non-dismissible banner at the top of the All tab:
- Background: `color-bg-elevated`, `radius-lg`, padding `space-4`
- Text: `Enable push notifications to get match and session alerts.` — `text-small`, `color-text-secondary`
- `Enable` link → opens OS notification permission settings
- Banner persists until permission is granted

---

## Responsive Layout

### Breakpoints
| Breakpoint | Layout change |
|-----------|--------------|
| Mobile < 768px | Full-screen list, swipe-to-dismiss |
| Tablet 768–1023px | `max-width: 640px`, centered |
| Desktop ≥ 1024px | Left sidebar + centered notification feed with hover interactions |

### Desktop (≥ 1024px)

```
┌────────────┬──────────────────────────────────────────────────┐
│  Sidebar   │  Notifications                  [Mark all read]  │
│            ├──────────────────────────────────────────────────┤
│            │  [ UNREAD (3) ]  [ ALL ]                         │
│            ├──────────────────────────────────────────────────┤
│            │                                                  │
│            │  Today                                           │
│            │  ┌────────────────────────────────────────────┐  │
│            │  │ ● [icon]  Your match is complete     2h ago │  │
│            │  │           Sunrise BC                  [ × ] │  │ ← hover reveals dismiss
│            │  │           Submit your reviews now.          │  │
│            │  └────────────────────────────────────────────┘  │
│            │  ...                                              │
└────────────┴──────────────────────────────────────────────────┘
```

- **Content max-width**: `720px`, centered within the main area (notifications are naturally a narrow feed)
- **Swipe-to-dismiss**: replaced on desktop by a `×` dismiss button that appears on **row hover** (top-right of the row)
- **Row hover state**: `color-bg-surface` → `color-bg-elevated` background; `×` button fades in
- **Notification rows**: slightly wider — more body text visible without truncation (3 lines instead of 2)
- **Mark all read**: stays top-right; standard button
- **Date group headers**: same treatment; more visual separation with `space-8` top margin between groups
- **Push permission banner**: on desktop, renders as a full-width info bar (not a card) at the top of the content area, with `Enable` link

### Tablet (768–1023px)
- `max-width: 640px`
- Swipe-to-dismiss retained

---

## Design Tokens
| Token | Usage |
|-------|-------|
| `color-bg-base` | Page background, read notification rows |
| `color-bg-surface` | Unread notification rows |
| `color-bg-elevated` | Category icon backgrounds, push permission banner |
| `color-accent` | Unread dot, left stripe, session/level-up icons, mark all read link |
| `color-accent-subtle` | Session + EXP icon backgrounds |
| `color-warning` | Review prompt icon |
| `color-error` | Swipe-to-clear zone |
| `color-border` | Row dividers |
| `color-text-primary` | Notification titles (read); Bold `color-text-primary` (unread) |
| `color-text-secondary` | Body copy, source, date group headers |
| `color-text-disabled` | Timestamp, chevron, empty state |
| `text-heading` 18px SemiBold | Page title, empty state title |
| `text-body` 15px | Notification title |
| `text-small` 13px | Body copy, push permission banner |
| `text-micro` 10px | Source + timestamp |
| `text-label` 12px | Tab labels |
| `radius-full` | Category icon circles |
| `radius-lg` 14px | Push permission banner |
| `motion-default` 200ms | Tab switch, row mark-as-read fade |
