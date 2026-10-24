# View: Session Discovery Dashboard

## Purpose

The post-login **Home** screen and primary **Que Session** discovery surface. Players browse open and active sessions near their location on a full-screen map (default), or switch to List or Grid views. From here they can join a session (Lobby) or resume an in-progress session.

**Club Owners** and **Que Masters** may create sessions from here or club hubs. Regular Players cannot create Que Sessions.

> **Canonical rules:** [`../../../business_logic/client_app/08_queue_session.md`](../../../business_logic/client_app/08_queue_session.md)

**Inspiration:** Airbnb (map + list discovery, location search), Nomad Table (nearby activity pins).

**Supersedes:** The card-feed layout described in [`home.md`](./home.md) for the `/dashboard` route. Active Session Banner behavior is retained from that spec.

## Route

`/dashboard` — authenticated users only (nav label: **Home**)

## Roles

All authenticated roles: **Player**, **Que Master**, **Club Owner**. **Create Session** CTA visible only to **Que Master** and **Club Owner**.

---

## Layout

Full-bleed map canvas within the dashboard main content area (sidebar at ≥1024px). Overlay panels float above the map. List and Grid modes replace the map with a scrollable `surface-dim` background.

```
┌─────────────────────────────────────────────────────────────────┐
│  [ Location search + filter chips ]        [ Map | List | Grid ] │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 🟢 LIVE · Sunrise BC · Hall B          [ VIEW SESSION → ] │  │  ← Active banner (conditional)
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│                     FULL-SCREEN MAP (default)                    │
│                     session pins + tooltips                      │
│                                                                  │
│  [ START QUICK SESSION ]                    [ Active courts ]   │
└─────────────────────────────────────────────────────────────────┘
```

> **Out of scope for this view:** Sidebar and top navbar chrome — use existing `DashboardLayout` / `Navbar` components unchanged.

---

## View Modes

| Mode | Default | Background | Data source |
|------|---------|------------|-------------|
| **Map** | Yes | Mapbox dark map + radial accent gradient | `GET /api/sessions/discover` |
| **List** | No | `surface-dim` scrollable column | Same |
| **Grid** | No | `surface-dim` responsive grid | Same |

View preference stored in Redux `uiSlice.dashboardViewMode` for the browser session.

---

## Components

### ViewToggle

- **Position:** `absolute top-20 right-8 z-30`
- **Container:** `bg-surface-container-lowest/80 backdrop-blur-md rounded-xl p-1.5 border border-outline-variant/10`
- **Tabs:** Map · List · Grid
- **Active tab:** `bg-primary-container text-on-primary-fixed`, filled icon
- **Inactive:** `text-on-surface-variant hover:bg-surface-container-high`
- **Labels:** `text-[10px] font-bold uppercase tracking-widest`

### MapSearchOverlay

- **Position:** `absolute top-20 left-1/2 -translate-x-1/2 z-20 max-w-md w-full px-4`
- **Container:** `bg-surface-container-lowest/90 backdrop-blur-xl rounded-2xl p-4 shadow-2xl border border-outline-variant/5`

**Search mode tabs** (inline icon toggles inside the input row):

| Mode | Icon | What it does |
|------|------|--------------|
| Place (default) | `MapPin` | Forward-geocode the typed text → re-center map. Accepted Mapbox types: `region`, `place`, `locality`, `neighborhood`, `address` (province/region down to street). **Only country-level results are excluded** (so "Cebu" province resolves). |
| Club | `Building2` | Filters which venue pins appear — substring match on club name. Does **not** move the map. |

**Place search UX:**
- Editable input; current city from `useGeolocation.locationLabel` as placeholder
- Autocomplete dropdown (≤5 Mapbox suggestions) below input
- Select suggestion → close dropdown → `flyTo` new center → refetch sessions
- When input is empty and user taps the row → `refresh()` re-centers on device position

**Club search UX:**
- Free-text input, debounced 300ms
- Filters `venueGroups` client-side — only venues with a session from a matching club remain
- Map center unchanged; filter chips still apply

**Filter row** (horizontal scroll, below the input row):

Quick chips for common filters + a dedicated **Filters button**:

| Chip | Filter applied |
|------|----------------|
| Nearby (< 2km) | `radiusKm: 2` |
| Doubles Only | `playersPerCourt: 4` |
| Weekend | `weekendOnly: true` |

Active chip: `border-primary-container/20 bg-primary-container/5 text-primary-container`

**Filters button** (`SlidersHorizontal` icon + label "Filters"): opens the `FilterPanel`. Shows a badge dot when any panel filter is active.

### FilterPanel

Opened by the Filters button.

| Breakpoint | Container | Behaviour |
|------------|-----------|-----------|
| Mobile < 768px | existing `MobileDrawer` (bottom) | Slides up from bottom; swipe-down or tap backdrop to dismiss |
| Desktop ≥ 768px | existing `Popover` anchored to Filters button | Dropdown; close on outside click |

**Header:**

```
Filters                           [Clear all]
```

"Clear all" is disabled when no panel filters are active.

**Availability section:**

```
AVAILABILITY

  ○  Not Full    — sessions with open slots
  ○  Full        — sessions with no open slots
```

Radio group (single select). **Default = neither (show all)** — full sessions are not hidden by default since cancellations can reopen a slot and players can still waitlist. Active radio: `text-primary-container`.

**Coming Soon section:**

```
MORE FILTERS

  Schedule Type         COMING SOON
  Match Format          COMING SOON
  Skill Level           COMING SOON
```

Non-interactive rows. Badge style: `bg-surface-container-high text-on-surface-variant text-[9px] uppercase rounded-full px-2`.

**Apply button — dynamic count:**

| State | Button label |
|-------|-------------|
| No filter ticked | `12 sessions` (total count, informational — no "Show") |
| Filter ticked | `Show 7 sessions` (matched count; updates live as user toggles) |

> Neutral wording "sessions" (not "available") — full sessions are valid results and stay visible by default, so "available" would mislead when the Full filter is active.

- Count is computed client-side against the current `venueGroups` — no extra API call while panel is open
- Full-width button: `bg-primary-container text-on-primary-fixed font-black uppercase`
- Tapping commits `pendingFilters` → `activeFilters`, closes the panel, and triggers a session refetch

### DashboardMap

- **Position:** `absolute inset-0 z-0`
- **Style:** Custom Mapbox dark style (`NEXT_PUBLIC_MAPBOX_STYLE_URL`)
- **Overlay:** Radial gradient `primary-container` at 5% opacity, center
- **Controls:** Pinch/scroll zoom only (no default Mapbox UI chrome, or minimal styled controls)
- **Center:** User device geolocation on load — map opens where they are (e.g. Cebu when in Cebu); `flyTo` at zoom 13 when permission granted; Cebu City fallback when denied

### VenuePin

One pin per physical venue (may represent 1–N sessions sharing the same `venueKey`).

| Variant | When | Size | Icon | Glow |
|---------|------|------|------|------|
| `live` | Any session at venue is `active` | 40px | `bolt` filled | Neon drop-shadow |
| `upcoming` | All sessions are `open` (none yet active) | 32px | `stadium` | None |
| `multi` modifier | `sessions.length > 1` | +badge | Count badge bottom-right | — |
| `full` modifier | All sessions full (`acceptedCount >= totalSlots`) | — | — | Muted (`opacity-60 grayscale`) + small `FULL` tag; still clickable |
| `selected` | Tooltip is open | +10% scale | — | Stronger glow |

**Full handling:** `full` is a modifier layered on `live`/`upcoming` — a live-but-full venue still reads as live, just muted. Only mute when *every* session at the venue is full. Full pins are never hidden (cancellations can reopen slots; players can waitlist). A `live` base always wins over `upcoming`.

**Session visibility:** A venue pin stays on the map while at least one session has `status = open OR active`. It disappears only when all its sessions are `closed`, `completed`, or `cancelled`.

**Count badge:** Small circle `bg-primary-container text-on-primary-fixed text-[10px]` with session count.

**Hover / tap:**

| Device | Trigger | Action |
|--------|---------|--------|
| Desktop (`pointer: fine`) | `onMouseEnter` | Open tooltip after 100ms |
| Desktop | `onMouseLeave` pin + tooltip | Close tooltip after 200ms |
| Mobile (`pointer: coarse`) | `onClick` | Toggle tooltip |

### VenuePinTooltip

Glass panel anchored above pin. Content depends on session count.

**Single session:**

```
┌─────────────────────────────────────┐
│ [LIVE NOW / OPEN / UPCOMING]  1.2km │
│ Sunrise Badminton Club              │
│ Cebu City Sports Center             │
│ 🕐 8:00 AM - 11:00 AM              │
│ (◔)(◔)(◔) +9 recently joined        │
│ 12/16 Slots             [ JOIN ]    │
└─────────────────────────────────────┘
```

**Recent-player avatars:** up to 3 overlapping avatars from `session.recentPlayers` (newest accepted first), reusing the `small-user-card` avatar. Overflow `+{acceptedCount - 3} recently joined` doubles as the "view more" affordance (opens session roster). If `acceptedCount === 0`, show `Be the first to join`. In the multi-session layout, each session row carries its own compact avatar stack.

**Multiple sessions** (shows first 2 by nearest date, then overflow):

```
┌─────────────────────────────────────┐
│ Lapu-Lapu Hoops Dome      1.5km     │
│ ─────────────────────────────────── │
│ [LIVE]  8:00 AM   12/16   [ JOIN ]  │
│ [OPEN]  2:00 PM    4/16   [ JOIN ]  │
│                                     │
│      [ See 3 more sessions ]        │
└─────────────────────────────────────┘
```

- Sessions within tooltip sorted by `dateTime` ascending
- "See X more sessions" button visible only when `sessions.length > 2`
- Tooltip stays open while cursor is inside it (desktop)

Container: `bg-bg-base/80 backdrop-blur-xl rounded-xl border border-primary-container/30` (live) or `border-outline-variant/10` (open/upcoming)

### VenueSessionsModal

Opened via "See more" button in `VenuePinTooltip`.

- existing `Dialog` (desktop) / `MobileDrawer` (mobile)
- Header: venue name + address + distance
- Body: all sessions at venue sorted by `dateTime` ascending
- Status labels: `LIVE` (active), `OPEN` (open + started), `UPCOMING` (open + future date)
- Each row: `SessionDiscoveryCard variant="compact"` — status · time · slots · Join button
- Close on Escape or backdrop click

### SessionListView

- Scrollable list of `SessionDiscoveryCard variant=list`
- Sort: distance ascending
- Section label: `N sessions near you` — uppercase micro
- Row spacing via `gap-3`; no divider lines (No-Line rule)

### SessionGridView

- `grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4`
- `SessionDiscoveryCard variant=grid`
- Live sessions: `sm:col-span-2` on tablet+

### QuickSessionButton

- **Position:** `absolute bottom-10 left-10 z-30`
- **Shape:** `rounded-full` pill
- **Variants** (mutually exclusive — see § Active-Session Guard — Date/Time Gate):

| Variant | When | Icon | Micro label | Main label |
|---------|------|------|-------------|------------|
| `create` | No enrolled session | `Plus` | `SCHEDULE SESSION` | `START QUICK SESSION` |
| `scheduled` | Enrolled in future `open` session (`dateTime > now`) | `Calendar` | `UPCOMING SESSION` | `VIEW SESSION` |
| `resume` | Enrolled in **current** session (see gate below) | `Play` | `ACTIVE SESSION` | `RESUME SESSION` |

- **`create`:** 56px gradient circle (`from-primary to-primary-container`) with `+`; opens `QuickSessionSheet`
- **`scheduled`:** Muted accent styling (no pulsing glow); tap → `/find-sessions/[id]`
- **`resume`:** Accent glow; tap → `/find-sessions/[id]`
- **Hover:** Expand padding; background → `primary-container`; reveal chevron
- **Guard:** Cannot open `create` while user has any enrolled session (`current` or `scheduled`)

### CreateSessionSheet (Que Master / Club Owner only)

- Visible only when current user is Que Master or Club Owner
- `MobileDrawer` from bottom (mobile) or `Dialog` (desktop)
- Form fields: session title, club, origin (Club / Friendly), Session type (Club only), venue (`VenuePicker`), date, start time, courts, players per court, match format, score limit, visibility
- Submit label: `PUBLISH SESSION` or `OPEN SESSION`
- Subcopy: Friendly Que Sessions are Regular (no EXP/MMR). Club Que Sessions require Session type.

### ActiveSessionBanner

Visible **only** when the user has a **current** enrolled session (see § Active-Session Guard — Date/Time Gate). Not shown for **scheduled** (future) enrollments.

| Element | Spec |
|---------|------|
| Background | `primary-container/10` |
| Left stripe | 3px `primary-container` |
| Live dot | 8px pulse, `primary-container` |
| Label | `LIVE` (DB `active`) or `IN QUEUE` (DB `open` + `dateTime <= now`) — uppercase micro |
| Body | Club name + optional court hint |
| CTA | `VIEW SESSION →` — `text-label text-accent` |
| Tap | Entire banner → `/find-sessions/[id]` |

### Active-Session Guard — Date/Time Gate

A user may be **enrolled** in a session (registration exists) without being **in session** for dashboard UI purposes. Enrollment and "current session" are separate concepts.

| Sub-state | Criteria | Dashboard UI |
|-----------|----------|--------------|
| **`current`** | DB status `active`, **or** DB status `open` with `dateTime <= now` | `ActiveSessionBanner` + `QuickSessionButton` `resume` variant |
| **`scheduled`** | DB status `open` with `dateTime > now` | `QuickSessionButton` `scheduled` variant only — no banner, no LIVE strip |
| **none** | No qualifying enrollment | `QuickSessionButton` `create` variant |

**Why:** Creating a Quick Session enrolls the host immediately (`accepted` / `not_arrived`) but the session may be scheduled for a future time. The host must not see "ACTIVE SESSION" or LIVE indicators until the scheduled start time arrives or the host explicitly starts the session (DB → `active`).

**`GET /api/sessions/active` response:**

```json
{
  "current": { "...ActiveSessionSummary" } | null,
  "scheduled": { "...ActiveSessionSummary" } | null
}
```

**Selection priority** (when multiple enrollments match): prefer DB `active` over `open`; prefer higher `player_status` priority (`playing` → `waiting` → `i_am_in` → … → `not_arrived`); prefer most recent `dateTime`. Apply the date/time gate **after** selecting the best enrollment to assign `current` vs `scheduled`.

**Join guard:** `AlreadyInSessionDialog` blocks joining a different session when the user has **either** `current` or `scheduled` enrollment (enrollment exists regardless of timing).

### AlreadyInSessionDialog

Shown when user in active session taps Join on a different session.

- Title: "You're already in a session"
- Body: Club name of current session
- Primary: `GO TO MY SESSION`
- Secondary: `Stay here`

---

## States

### Default — Map view, no active session

- Map centered on user location
- Pins for nearby `open` and `active` sessions with coordinates
- **Create Session** CTA visible bottom-left (Que Master / Club Owner only)
- No active banner

### In current session

- Active Session Banner at top
- **Create Session** CTA hidden; **RESUME SESSION** (`resume` variant)
- Join on other sessions → blocking dialog
- Map pins still visible for context

### Enrolled in scheduled (future) session

- No Active Session Banner
- **QuickSessionButton** shows `scheduled` variant (`UPCOMING SESSION` / `VIEW SESSION`)
- **Create Session** CTA hidden (already enrolled)
- Join on other sessions → blocking dialog (`AlreadyInSessionDialog`)
- Map pins still visible for context

### Geolocation denied

- Map centers on **Cebu City, Philippines** (regional default)
- Location overlay shows `Cebu City, Philippines`
- Copy: no blocking error — discovery still works with fallback center

### Geolocation granted

- Map `flyTo` user's device coordinates at zoom 13
- Location overlay shows reverse-geocoded city (e.g. `Cebu City`)
- Tap location row to re-request position and re-center

### No sessions nearby

- Map with no pins
- List/Grid empty state: "No sessions in this area. Try expanding your search radius."
- Quick Session CTA still available (if not in active session)

### Session no longer available (graceful failure)

- Triggered when Join resolves to a session that has since filled, `closed`, `completed`, or `cancelled` (stale data)
- Shows `SessionUnavailableDialog` (reuses `AlertDialog`): "This session is no longer available… here are other sessions near you" with `REFRESH NEARBY` + `Close`
- `REFRESH NEARBY` invalidates and refetches discovery; the stale pin/row drops off
- Map tile/token failure degrades to List view with a non-blocking toast ("Map unavailable — showing list")

### Loading

- `DashboardSkeleton` full viewport while map loads
- Search overlay shows "Locating…" during geolocation
- Load order: map shell paints first (fallback center) → geolocation resolves → sessions fetch for the resolved center

---

## Interactions

| Action | Device | Result |
|--------|--------|--------|
| Hover over VenuePin | Desktop | Open tooltip after 100ms |
| Mouse leaves pin + tooltip | Desktop | Close tooltip after 200ms |
| Tap VenuePin | Mobile | Toggle tooltip open/closed |
| Tap map background | Both | Close tooltip |
| Tap Join (tooltip or modal row) | Both | Navigate to `/sessions/[id]` (or active-session guard) |
| Tap "See X more sessions" | Both | Open VenueSessionsModal for that venue |
| Tap view toggle | Both | Switch Map / List / Grid |
| Tap filter chip | Both | Toggle quick filter; refetch sessions |
| Tap Filters button | Both | Open FilterPanel (MobileDrawer on mobile, Popover on desktop) |
| Tick availability filter | Both | Pending filter applied; Apply button → "Show X sessions" |
| Tap Apply in FilterPanel | Both | Commit filters; close panel; refetch sessions |
| Tap Clear all in FilterPanel | Both | Reset all panel filters to undefined |
| Type in Place search | Both | Mapbox geocode (city/street/neighbourhood only) → flyTo new center → refetch |
| Select place suggestion | Both | Apply place; close dropdown; flyTo |
| Type in Club search | Both | Filter venue pins by club name (debounced 300ms; no re-center) |
| Tap location row (empty input) | Both | Re-request geolocation; re-center map |
| Tap Create Session | QM / CO only | Open create sheet |
| Submit new session | QM / CO only | Create session; redirect to `/sessions/[id]` |

---

## Responsive Layout

| Breakpoint | Navigation | Dashboard layout |
|------------|------------|------------------|
| Mobile < 768px | Bottom nav | Full-bleed map; overlays stack; bottom padding for nav |
| Tablet 768–1023px | Bottom nav | Same; search overlay `max-w-md` centered |
| Desktop ≥ 1024px | Left sidebar 240px | Map in main slot; overlays respect sidebar offset |

**Desktop notes:**

- View toggle stays top-right of main content (not under sidebar)
- Quick Session pill bottom-left of main content
- List/Grid: `max-w-[1200px] mx-auto` optional for readability

---

## Design Tokens

| Token | Usage |
|-------|-------|
| `surface-dim` | Map fallback / list background |
| `surface-container-lowest` | Glass panels, search overlay |
| `surface-container-high` | Inactive pins, filter button |
| `primary-container` | Live pins, active chips, Join CTA |
| `on-primary-fixed` | Text on primary-container buttons |
| `outline-variant/10` | Ghost borders on glass panels |
| `text-micro` uppercase | Status badges, toggle labels |
| `backdrop-blur-xl` | Search overlay, tooltips |

Follow **No-Line rule:** no 1px list dividers; use spacing and tonal backgrounds.

---

## API Dependencies

| Endpoint | Purpose |
|----------|---------|
| `GET /api/sessions/discover` | Nearby sessions |
| `GET /api/sessions/active` | Current user's enrolled session split into `current` and `scheduled` (date/time gate) |
| `POST /api/sessions` | Create Que Session (Club Owner or Que Master only) |
| `GET /api/places/search` | Typeahead search for confirmed places (Phase 4a) |
| `POST /api/places/submit` | Player submits a new unreviewed place (Phase 4a) |

> **Phase 4b:** [`VenuePicker`](../components/venue-picker.md) in `QuickSessionSheet` embeds [`AddressPinField`](../components/address-pin-field.md) for new pins, backed by the places search and submit routes above.

---

## References

- Master plan: [`PLAN_session_discovery_dashboard.md`](../../../PLAN_session_discovery_dashboard.md)
- Phase plans at repo root: [`PLAN_qm_session_active_state.md`](../../../PLAN_qm_session_active_state.md) (master), `PLAN_phase_0_qm_session_docs` through `PLAN_phase_7_qm_live_chrome`
- Business rules: [`docs/business_logic/client_app/08_queue_session.md`](../../../business_logic/client_app/08_queue_session.md)
- Maps tech: [`docs/techstack/04_tech_stack_reference.md §3.10`](../../../techstack/04_tech_stack_reference.md#310-maps--geolocation)
- DB fields: [`docs/database/03_queue_sessions.md`](../../../database/03_queue_sessions.md)
