# Queue Session Specification

## Purpose

Client queue-session discovery, casual session creation, live lobby/console reads, mock join/waitlist screens, a mock attendance check-in screen, a mock QM Court View, a mock QM Queue View, a mock QM Add Match screen, and mock player Courts / Queue / Standings screens in `apps/client`. Players can find open/active sessions, create a Quick Session, start/close as host, and leave. Standalone `/sessions/join` and `/sessions/joined` screens render the Smash Hub Ortigas fixture; JOIN does not persist a registration. Standalone `/sessions/attendance` renders the Smash Hub Ortigas attendance fixture; I AM IN is a client-only toast and local arrived flip. Standalone `/sessions/court` renders the Smash Hub Ortigas court fixture; HOLD COURT 1 is a client-only toast and local On Hold flip. Standalone `/sessions/queue` renders the Smash Hub Ortigas queue fixture; SEND TO COURT 2 is a client-only toast. Standalone `/sessions/add-match` renders the Smash Hub Ortigas add-match fixture; ADD MATCH is a client-only toast. Standalone `/sessions/play/courts`, `/sessions/play/queue`, and `/sessions/play/standings` render the Smash Hub Ortigas player in-session fixture; they are read-only and do not persist. `GET /api/sessions/[id]` is still mock discovery only. There is no POST register/waitlist, attendance, court, queue, or add-match API. The prepared-flow step is shown locked and is not implemented. Umpire/QR scoring is not implemented in the client.

## Requirements

### Requirement: Authenticated session APIs
Session APIs under `/api/sessions/*` MUST require a current profile. Missing auth SHALL return HTTP 401.

#### Scenario: Discover without a session
- GIVEN no current profile
- WHEN `GET /api/sessions/discover` is called
- THEN the API returns HTTP 401

### Requirement: Geo discovery
`GET /api/sessions/discover` SHALL require numeric `lat` and `lng`. It MUST return `{ sessions, venueGroups }` for `queue_sessions` with status `open` or `active` that are visible to the viewer. Sessions with visibility `club_members` SHALL be hidden unless the viewer is an active member of that `clubId`. Open sessions whose `dateTime` is more than 12 hours in the past SHALL be excluded. Missing coordinates SHALL return HTTP 400.

#### Scenario: Valid discovery query
- GIVEN a signed-in player and valid `lat`/`lng`
- WHEN they GET `/api/sessions/discover`
- THEN the response includes `sessions` and `venueGroups` from the database

#### Scenario: Missing coordinates
- GIVEN a signed-in player
- WHEN they GET `/api/sessions/discover` without `lat` and `lng`
- THEN the API returns HTTP 400

### Requirement: Available, my, and active session lists
`GET /api/sessions/available` SHALL list open/active sessions visible to the user (no geo filter). `GET /api/sessions/my` SHALL list sessions the user is registered for. `GET /api/sessions/active` SHALL return the best current or scheduled enrolled session where `admissionStatus` is `accepted`, `waitlisted`, or `reserved` and `playerStatus` is not `exited`, for sessions in `open` or `active`.

#### Scenario: Find-sessions available tab
- GIVEN a signed-in player
- WHEN `/find-sessions` loads the Available tab
- THEN it reads `GET /api/sessions/available`

#### Scenario: Dashboard active banner
- GIVEN the player has an accepted registration on an open or active session
- WHEN the dashboard loads
- THEN `GET /api/sessions/active` can return that session for the banner

### Requirement: Quick Session create
`POST /api/sessions/quick` SHALL validate the Quick Session form, optionally require an active `club_members` row when `clubId` is set (HTTP 403 otherwise), force `visibility` to `open` when there is no club, geocode the venue when coordinates are missing, and in one transaction create a `queue_sessions` row (`origin: player_organized`, `status: open`) plus a host registration with `admissionStatus: accepted`.

#### Scenario: Clubless quick session
- GIVEN a signed-in player
- WHEN they post a valid payload without `clubId`
- THEN a session is created with `visibility` `open`
- AND the host is registered as accepted
- AND the client navigates to `/find-sessions/{id}`

#### Scenario: Club-scoped session without membership
- GIVEN a `clubId` the player is not an active member of
- WHEN they post `/api/sessions/quick`
- THEN the API returns HTTP 403

### Requirement: Host start and close
`POST /api/sessions/[id]/start` SHALL allow only the `hostId`, and only when status is `open`, then set status to `active`. `POST /api/sessions/[id]/close` SHALL allow only the host, and only when status is `draft`, `open`, or `active`, then set status to `closed`. Wrong host SHALL return 403. Wrong status SHALL return 409. Missing session SHALL return 404.

#### Scenario: Host starts an open session
- GIVEN the current profile is the session host
- AND the session status is `open`
- WHEN they POST `/api/sessions/[id]/start`
- THEN the session status becomes `active`

#### Scenario: Non-host tries to start
- GIVEN a player who is not `hostId`
- WHEN they POST start
- THEN the API returns HTTP 403

### Requirement: Leave session
`POST /api/sessions/[id]/leave` SHALL set the viewer's registration to `playerStatus: exited` and `admissionStatus: exited`. Missing registration SHALL return 404. Already-exited SHALL return 409.

#### Scenario: Registered player leaves
- GIVEN the viewer has a non-exited registration
- WHEN they POST leave
- THEN that registration is marked exited

### Requirement: Live read models
`GET /api/sessions/[id]/live` SHALL return session context plus `viewerRegistration` (null when missing or exited). `GET /api/sessions/[id]/roster` SHALL return accepted and waitlisted players. `GET /api/sessions/[id]/console` SHALL return courts, queue, roster, and standings derived from `Match` rows and registrations. Missing sessions SHALL return 404.

#### Scenario: Live page routing
- GIVEN a session loaded via `/find-sessions/[sessionId]`
- WHEN status is `open` and the viewer is the host
- THEN the QM pre-active lobby is shown
- AND when status is `active` the host sees the QM console and others see the player active view
- AND `closed` / `completed` / `cancelled` show the closed view

### Requirement: Mock join and waitlist screens
`/sessions/join` and `/sessions/joined` SHALL render standalone mock UI: dashboard chrome and the tester banner MUST be hidden via `isSessionStandaloneRoute`. Copy, capacity, and queue SHALL come from `MOCK_SESSION_JOIN` (Smash Hub Ortigas). Queue player statuses SHALL be `accepted`, `waitlisted`, or `reserved`. Accepted slot max SHALL be `courts × playersPerCourt` via `acceptedCapacity()`. JOIN on `/sessions/join` SHALL be a client `Link` to `/sessions/joined` and MUST NOT POST a register or waitlist API. `/sessions/joined` SHALL show the accepted state, a decorative (non-encoded) QR, and SHARE QR that uses Web Share or clipboard of the mock join path `/sessions/join`.

#### Scenario: Join listing is standalone mock
- GIVEN a signed-in player
- WHEN they open `/sessions/join`
- THEN the Smash Hub Ortigas listing renders (status, meta cards, capacity, queue)
- AND dashboard chrome and the tester banner are hidden

#### Scenario: JOIN navigates without persisting
- GIVEN the player is on `/sessions/join`
- WHEN they activate JOIN
- THEN the client navigates to `/sessions/joined`
- AND no register or waitlist API is called
- AND no session-registration row is created

#### Scenario: Accepted share screen
- GIVEN a signed-in player
- WHEN they open `/sessions/joined`
- THEN the accepted state is shown with a decorative QR and SHARE QR
- AND SHARE QR uses Web Share when available, otherwise copies `/sessions/join` to the clipboard

### Requirement: Mock attendance check-in screen
`/sessions/attendance` SHALL render standalone mock UI: dashboard chrome and the tester banner MUST be hidden via `isSessionStandaloneRoute`. The header SHALL be ROTRA / Run the game. with no tester chip. Copy and session details SHALL come from `MOCK_SESSION_ATTENDANCE` and `MOCK_SESSION_ATTENDANCE_META` (Smash Hub Ortigas). Default state SHALL be Accepted + Not arrived: YOUR STATUS `Joined • not arrived` with ACCEPTED, orange NOT ARRIVED, event 2×2 (Smash Hub Ortigas, Sun, Aug 23, 7:00—9:00 PM, Doubles • 2 x 4), `8 accepted • rest waitlisted`, and ATTENDANCE Step 1 of 2 with I am in (NOW) and I am prepared (LOCKED). Sticky I AM IN SHALL toast and flip local arrived state only. It MUST NOT call an attendance API or write the database. The prepared step SHALL stay locked; the prepared flow is not implemented.

#### Scenario: Attendance screen is standalone mock
- GIVEN a signed-in player
- WHEN they open `/sessions/attendance`
- THEN the Smash Hub Ortigas attendance fixture renders (Accepted + Not arrived, event meta, Step 1 of 2)
- AND dashboard chrome and the tester banner are hidden
- AND no tester chip is shown

#### Scenario: I AM IN is local only
- GIVEN the player is on `/sessions/attendance` in the default not-arrived state
- WHEN they activate I AM IN
- THEN a client toast reports check-in
- AND the UI flips locally to arrived (ARRIVED, `Joined • arrived`, Step 1 DONE / IN, CTA YOU’RE IN disabled)
- AND no attendance API is called
- AND no registration or attendance row is written

#### Scenario: Prepared step stays locked
- GIVEN the player is on `/sessions/attendance`
- WHEN they view ATTENDANCE Step 1 of 2
- THEN I am prepared is shown as LOCKED
- AND there is no implemented prepared-flow action

### Requirement: Mock QM Court View screen
`/sessions/court` SHALL render standalone mock UI: dashboard chrome and the tester banner MUST be hidden via `isSessionStandaloneRoute`. The header SHALL be ROTRA / Run the game. with no tester chip and no QUE MASTER pill. Copy and court cards SHALL come from `MOCK_SESSION_COURT` and `MOCK_SESSION_COURTS` (Smash Hub Ortigas). Default state SHALL be Court view, `Smash Hub Ortigas • 7:00—9:00 PM • Doubles`, `1 LIVE COURT`, Court 1 ACTIVE (TEAM A Jae Lim / Mia Reyes vs TEAM B Kai Tan / Lia Santos, `11—8`, `08:24 elapsed`), and Court 2 EMPTY (`No match on this court. It's free for the next pairing.`). The STATUS legend SHALL show ACTIVE, EMPTY, and ON HOLD. Sticky HOLD COURT 1 SHALL toast and flip Court 1 to ON HOLD locally (RESUME COURT 1 reverses that flip). It MUST NOT call a court API or write the database. There is no ADD MATCH control.

#### Scenario: Court view is standalone mock
- GIVEN a signed-in player
- WHEN they open `/sessions/court`
- THEN the Smash Hub Ortigas court fixture renders (`1 LIVE COURT`, Court 1 ACTIVE `11—8`, Court 2 EMPTY)
- AND dashboard chrome and the tester banner are hidden
- AND no tester chip is shown
- AND there is no ADD MATCH control

#### Scenario: HOLD COURT 1 is local only
- GIVEN the player is on `/sessions/court` with Court 1 ACTIVE
- WHEN they activate HOLD COURT 1
- THEN a client toast reports Court 1 is on hold
- AND Court 1 flips locally to ON HOLD
- AND the sticky CTA becomes RESUME COURT 1
- AND the live-court label updates from remaining ACTIVE courts
- AND no court API is called
- AND no match or court row is written

#### Scenario: RESUME COURT 1 is local only
- GIVEN Court 1 is ON HOLD on `/sessions/court`
- WHEN they activate RESUME COURT 1
- THEN a client toast reports Court 1 is active
- AND Court 1 flips locally to ACTIVE
- AND no court API is called
- AND no match or court row is written

### Requirement: Mock QM Queue View screen
`/sessions/queue` SHALL render standalone mock UI: dashboard chrome and the tester banner MUST be hidden via `isSessionStandaloneRoute`. The header SHALL be ROTRA / Run the game. with a QUE MASTER pill and no tester chip. Copy, next-up pairing, and upcoming matches SHALL come from `MOCK_SESSION_QUEUE`, `MOCK_QUEUE_NEXT_UP_PLAYERS`, and `MOCK_QUEUE_UPCOMING_MATCHES` (Smash Hub Ortigas). Default state SHALL be NEXT UP, Queue, `Smash Hub Ortigas • 7:00—9:00 PM • 2 courts • Doubles`, MATCH 1 • COURT 2 FREE (`Nico + Bea vs Eli + Sam`) with four READY rows (Nico Cruz / Bea Ortiz / Eli Park / Sam Cruz, 2 min), and NEXT MATCHES: rank 2 Ana + Jun vs Pat + Rio READY 8 min, rank 3 Ken + Val vs Drew + Pia WAITING 14 min. Drag grips and the “Drag to reorder” hint SHALL be visual only. Sticky SEND TO COURT 2 SHALL toast only and MUST NOT change the next-up or upcoming lists. It MUST NOT call a queue or court API or write the database. There is no ADD MATCH control.

#### Scenario: Queue view is standalone mock
- GIVEN a signed-in player
- WHEN they open `/sessions/queue`
- THEN the Smash Hub Ortigas queue fixture renders (NEXT UP pairing, upcoming matches)
- AND the QUE MASTER pill is shown
- AND dashboard chrome and the tester banner are hidden
- AND no tester chip is shown
- AND there is no ADD MATCH control

#### Scenario: SEND TO COURT 2 is local only
- GIVEN the player is on `/sessions/queue`
- WHEN they activate SEND TO COURT 2
- THEN a client toast reports Sent to Court 2
- AND the next-up and upcoming lists do not change
- AND no queue or court API is called
- AND no match or court row is written

#### Scenario: Reorder grips do not persist
- GIVEN the player is on `/sessions/queue`
- WHEN they view NEXT MATCHES
- THEN drag grips and “Drag to reorder” are shown
- AND reordering is not implemented

### Requirement: Mock QM Add Match screen
`/sessions/add-match` SHALL render standalone mock UI: dashboard chrome and the tester banner MUST be hidden via `isSessionStandaloneRoute`. The header SHALL be ROTRA / Run the game. with a QUE MASTER pill and no tester chip. Copy, team slots, and the waiting pool SHALL come from `MOCK_SESSION_ADD_MATCH`, `MOCK_ADD_MATCH_TEAM_A`, `MOCK_ADD_MATCH_TEAM_B`, and `MOCK_ADD_MATCH_POOL` (Smash Hub Ortigas). Default state SHALL be COURT 2 FREE, Add match, `Smash Hub Ortigas · Doubles · Court 2 free`, TEAM A Nico Cruz + Open vs TEAM B Bea Ong + Open, and WAITING longest-wait-first with `2 of 4` selected (Nico Cruz 22 min and Bea Ong 19 min selected; Eli Park 16 min, Sam Cruz 12 min, Ana Dela Cruz 9 min unselected). Sticky ADD MATCH SHALL toast only and MUST NOT change the teams or waiting list. It MUST NOT call a match or queue API or write the database. Team assignment and pool selection are visual only.

#### Scenario: Add match is standalone mock
- GIVEN a signed-in player
- WHEN they open `/sessions/add-match`
- THEN the Smash Hub Ortigas add-match fixture renders (COURT 2 FREE, TEAM A / TEAM B slots, WAITING pool)
- AND the QUE MASTER pill is shown
- AND dashboard chrome and the tester banner are hidden
- AND no tester chip is shown

#### Scenario: ADD MATCH is local only
- GIVEN the player is on `/sessions/add-match`
- WHEN they activate ADD MATCH
- THEN a client toast reports Match added
- AND the team slots and waiting list do not change
- AND no match or queue API is called
- AND no match or court row is written

#### Scenario: Pool selection does not persist
- GIVEN the player is on `/sessions/add-match`
- WHEN they view WAITING
- THEN longest-wait-first and `2 of 4` selected are shown
- AND assigning players to teams is not implemented

### Requirement: Mock player Courts / Queue / Standings screens
`/sessions/play/courts`, `/sessions/play/queue`, and `/sessions/play/standings` SHALL render standalone mock UI: dashboard chrome and the tester banner MUST be hidden via `isSessionStandaloneRoute`. Shared chrome SHALL be ROTRA / Run the game. with a YOU · JO chip (mobile) or You · Jo Cruz / Player · queued card (desktop sidebar), plus Courts / Queue / Standings tab chrome that only navigates between the three routes. Copy and roster SHALL come from `MOCK_PLAYER_SESSION` and the player courts / queue / standings fixtures (Smash Hub Ortigas). Courts default SHALL be `1 LIVE COURT`, Court 1 ACTIVE (TEAM A Jae Lim / Mia Reyes vs TEAM B Kai Tan / Lia Santos, `11—8`, `08:24 elapsed`), and Court 2 EMPTY (`No match on this court. Next pairing is waiting in queue.`). Queue default SHALL be `YOU'RE 2ND · ~8 MIN`, NEXT UP · COURT 2 FREE next pairing (Nico Cruz / Bea Ong vs Eli Park / Sam Cruz, READY), and UP NEXT view-only rows (You + Drew vs Pia + Ken YOU 8 min; Ana + Jun vs Pat + Rio READY 14 min; Nina + Omar vs Val + Alex WAITING 20 min). Standings default SHALL be `LIVE · 4 MATCHES IN` with PLAYER / W—L / Pts rows, Jo Cruz highlighted as YOU at rank 3 (`2—1`, `6`). The screens MUST be read-only: no live scores, no wait math, no queue edits, no status changes, no APIs, and no database writes. `/sessions/play` SHALL redirect to `/sessions/play/courts`.

#### Scenario: Player Courts is standalone mock
- GIVEN a signed-in player
- WHEN they open `/sessions/play/courts`
- THEN the Smash Hub Ortigas courts fixture renders (`1 LIVE COURT`, Court 1 ACTIVE `11—8`, Court 2 EMPTY)
- AND Courts / Queue / Standings tab chrome is shown
- AND the YOU · JO chip is shown
- AND dashboard chrome and the tester banner are hidden
- AND no tester chip is shown
- AND there is no hold, send, or add-match control

#### Scenario: Player Queue is standalone mock
- GIVEN a signed-in player
- WHEN they open `/sessions/play/queue`
- THEN the Smash Hub Ortigas queue fixture renders (next pairing READY, You + Drew highlighted, view-only upcoming rows)
- AND Courts / Queue / Standings tab chrome is shown
- AND dashboard chrome and the tester banner are hidden
- AND no queue edit or send-to-court control is shown

#### Scenario: Player Standings is standalone mock
- GIVEN a signed-in player
- WHEN they open `/sessions/play/standings`
- THEN the Smash Hub Ortigas standings fixture renders (rank 1 Jae Lim `3—0` / `9`, Jo Cruz YOU at rank 3)
- AND Courts / Queue / Standings tab chrome is shown
- AND dashboard chrome and the tester banner are hidden
- AND standings values are fixture-only

#### Scenario: Tab chrome does not persist
- GIVEN the player is on a player in-session screen
- WHEN they activate Queue or Standings
- THEN the client navigates to `/sessions/play/queue` or `/sessions/play/standings`
- AND no session API is called
- AND no match, queue, or standings row is written

### Requirement: Session-id join check remains mock-only
`GET /api/sessions/[id]` SHALL look up `MOCK_SESSION_DISCOVERY` only (HTTP 404 if absent, 410 if status is not `open` or `active`). There is no POST register/waitlist endpoint. The register button on the live `/find-sessions/[sessionId]` page SHALL be a no-op stub. Dashboard join that depends on the mock GET MAY report real database sessions as unavailable.

#### Scenario: Real session id on mock join check
- GIVEN a database session id that is not in `MOCK_SESSION_DISCOVERY`
- WHEN the dashboard join flow GETs `/api/sessions/[id]`
- THEN the API returns HTTP 404

#### Scenario: No register API
- GIVEN a player who is not registered
- WHEN they use the live-page register control
- THEN no session-registration row is created

### Requirement: Home aliases to dashboard
`/home` SHALL redirect to `/dashboard`. `/dashboard` SHALL be the geo discovery home (map/list/grid, filters, venue modal, active banner, Quick Session sheet). `/find-sessions` SHALL show Available and My Sessions tabs backed by the live list APIs.

#### Scenario: /home redirect
- GIVEN a signed-in player
- WHEN they request `/home`
- THEN they are redirected to `/dashboard`

## Documented product rules

The following rules come from `docs/business_logic/client_app/08_queue_session.md` (canonical Que Sessions). They are product intent and MUST NOT be treated as implemented unless a Current requirement above already states the same fact. Current discovery/create/start/close/leave and live reads are implemented; join, waitlist, attendance, court, queue, add-match, and player Courts / Queue / Standings screens remain mock.

Automatic Queueing is specified separately in `automatic-queueing`.

### Requirement: Who may create (documented)
Documented product rule: only a Club Owner or Que Master may create a Club or Friendly Que Session. A regular Player cannot. Club Que Sessions SHALL require Session type MMR or Fun Games. Friendly Que Sessions SHALL be Regular (no EXP/MMR). Session type SHALL NOT change after Active or after any match has started.

> Current `POST /api/sessions/quick` allows any signed-in player to create a player-organized session. That Current behavior stands. `docs/business_logic.md` also still describes player-organized creation.

#### Scenario: Type locked after Active (documented)
- GIVEN a Club Que Session is Active
- WHEN a host tries to change Session type from MMR to Fun Games
- THEN the documented rule refuses the change

### Requirement: Lifecycle
Documented states SHALL be Draft → Open → Active → Closed → Completed, with Cancelled terminal from Draft, Open, or Active. Refunds SHALL be handled manually outside ROTRA. Enrollment alone SHALL NOT mean “in session” for dashboard LIVE/resume indicators until status is `active` or `open` with `dateTime <= now`.

#### Scenario: Future open Quick Session
- GIVEN the host published an `open` session with future `dateTime`
- WHEN the dashboard evaluates “in session”
- THEN the host is enrolled but not in-session until Start Session or start time

### Requirement: Admission, waitlist, and slots
Capacity SHALL be `players_per_court × number_of_courts`. Overflow SHALL be waitlisted FIFO. A player SHALL have exactly one admission state: Not Registered, Pending Approval, Accepted, Waitlisted, Declined, Withdrawn, Cancelled Registration, Removed, or Reserved. Pending Approval SHALL not occupy a slot.

#### Scenario: Ninth player
- GIVEN capacity 8
- WHEN a ninth player is approved
- THEN they are waitlisted

### Requirement: I Am In and cancellation
I Am In SHALL require a confirmation modal and SHALL be irreversible by the Player. There SHALL be no automatic no-show that removes Accepted players. Free cancellation cutoff SHALL be 5 hours before start; after cutoff and before I Am In, cancellation remains allowed but payment obligation remains unless the host confirms replacement. Early Exit after I Am In SHALL require payment confirmation.

#### Scenario: Player cannot undo I Am In
- GIVEN the player confirmed I Am In
- WHEN they try to revert themselves to Not Arrived
- THEN the documented rule requires Que Master or Club Owner correction

### Requirement: Password-protected sessions
Password-protected sessions SHALL store hashes only. After the first failed attempt, retries SHALL be rate-limited to one per 5 minutes on the backend. Authorization SHALL be per user per session and revoked on cancel, withdraw, or Early Exit.

#### Scenario: Rapid password guesses
- GIVEN one failed password attempt
- WHEN the player retries immediately
- THEN the backend refuses until 5 minutes have passed

### Requirement: Request a Match and Feed
Request a Match SHALL create a proposal only — it MUST NOT create an active match or bypass Match Queue order. Every field change and manual host announcement SHALL write a Session Feed entry.

#### Scenario: Request is not a match
- GIVEN a player submits Request a Match
- WHEN it is pending
- THEN no active match is created until Que Master approval

### Requirement: Multi-QM and realtime
All assigned Que Masters SHALL have identical session-management permissions. Only the Club Owner MAY add, remove, or replace Que Masters, including while Active. The server SHALL be authoritative; multi-QM edits SHALL be last-write-wins with an audit trail.

#### Scenario: QM cannot remove another QM
- GIVEN two assigned Que Masters
- WHEN one tries to remove the other
- THEN the documented rule refuses

## Source

- `apps/client/src/app/(protected)/dashboard/page.tsx`
- `apps/client/src/app/(protected)/find-sessions/page.tsx`
- `apps/client/src/app/(protected)/find-sessions/[sessionId]/page.tsx`
- `apps/client/src/app/(protected)/home/page.tsx`
- `apps/client/src/app/(protected)/sessions/join/page.tsx`
- `apps/client/src/app/(protected)/sessions/joined/page.tsx`
- `apps/client/src/app/(protected)/sessions/attendance/page.tsx`
- `apps/client/src/app/(protected)/sessions/court/page.tsx`
- `apps/client/src/app/(protected)/sessions/queue/page.tsx`
- `apps/client/src/app/(protected)/sessions/add-match/page.tsx`
- `apps/client/src/app/(protected)/sessions/play/page.tsx`
- `apps/client/src/app/(protected)/sessions/play/courts/page.tsx`
- `apps/client/src/app/(protected)/sessions/play/queue/page.tsx`
- `apps/client/src/app/(protected)/sessions/play/standings/page.tsx`
- `apps/client/src/app/api/sessions/**`
- `apps/client/src/app/api/sessions/[id]/route.ts`
- `apps/client/src/constants/mock-session-join.ts`
- `apps/client/src/constants/mock-session-attendance.ts`
- `apps/client/src/constants/mock-session-court.ts`
- `apps/client/src/constants/mock-session-queue.ts`
- `apps/client/src/constants/mock-session-add-match.ts`
- `apps/client/src/constants/mock-player-session.ts`
- `apps/client/src/lib/sessions/session-standalone-route.ts`
- `apps/client/src/lib/sessions/session-display-utils.ts`
- `apps/client/src/components/modules/session/session-join-view/SessionJoinView.tsx`
- `apps/client/src/components/modules/session/session-joined-view/SessionJoinedView.tsx`
- `apps/client/src/components/modules/session/session-attendance-view/SessionAttendanceView.tsx`
- `apps/client/src/components/modules/session/session-court-view/SessionCourtView.tsx`
- `apps/client/src/components/modules/session/session-queue-view/SessionQueueView.tsx`
- `apps/client/src/components/modules/session/session-add-match-view/SessionAddMatchView.tsx`
- `apps/client/src/components/modules/session/player-session-shell/PlayerSessionShell.tsx`
- `apps/client/src/components/modules/session/player-courts-view/PlayerCourtsView.tsx`
- `apps/client/src/components/modules/session/player-queue-view/PlayerQueueView.tsx`
- `apps/client/src/components/modules/session/player-standings-view/PlayerStandingsView.tsx`
- `apps/client/src/components/modules/session/session-join-view/SessionJoinView.stories.tsx`
- `apps/client/src/components/modules/session/session-joined-view/SessionJoinedView.stories.tsx`
- `apps/client/src/components/modules/session/session-attendance-view/SessionAttendanceView.stories.tsx`
- `apps/client/src/components/modules/session/session-court-view/SessionCourtView.stories.tsx`
- `apps/client/src/components/modules/session/session-queue-view/SessionQueueView.stories.tsx`
- `apps/client/src/components/modules/session/session-add-match-view/SessionAddMatchView.stories.tsx`
- `apps/client/src/components/modules/session/player-session-shell/PlayerSessionShell.stories.tsx`
- `apps/client/src/components/modules/session/player-courts-view/PlayerCourtsView.stories.tsx`
- `apps/client/src/components/modules/session/player-queue-view/PlayerQueueView.stories.tsx`
- `apps/client/src/components/modules/session/player-standings-view/PlayerStandingsView.stories.tsx`
- `apps/client/src/lib/api/session-discovery.ts`
- `apps/client/src/lib/api/session-live.ts`
- `apps/client/src/lib/api/session-roster.ts`
- `apps/client/src/lib/api/session-console.ts`
- `apps/client/src/hooks/useSessionDiscovery/**`
- `apps/client/src/hooks/useQuickSessionMutation.ts`
- `apps/client/src/hooks/useStartSessionMutation.ts`
- `apps/client/src/hooks/useCloseSessionMutation.ts`
- `apps/client/src/hooks/useLeaveSessionMutation.ts`
- `packages/db/prisma/models_session.prisma`
- `packages/db/prisma/models_match.prisma`
