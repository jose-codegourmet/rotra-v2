# Player Information

## Purpose

Record the mock Player Information behavior implemented by P01.9–P01.15 (#151–#157)
and the subsequent prototype corrections. This specification describes this branch's
implementation; the business docs remain authoritative for product behavior and
`app/mocksups-app/player-app/rotra-player.html` for appearance and copy.

## Requirements

### Requirement: Public leaderboard and player navigation

The Player app SHALL expose the overall ROTRA leaderboard at `/`, using the shared
mock store and TanStack Query hooks. Singles and doubles SHALL share one rank.

#### Scenario: Browse and open a player
- GIVEN the normal fixture set of 1,284 eligible players
- WHEN a visitor opens the leaderboard
- THEN the top three appear on the prototype's green grid podium with portraits,
  stepped platforms and pixel fire, with reduced-motion support
- AND subsequent entries load in pages of 25
- AND selecting a podium player or a leaderboard row opens that player's public
  profile at `/players/[playerId]` without requiring sign-in.

#### Scenario: Search and exact RTR ID lookup
- WHEN a visitor searches by name or nickname
- THEN matching entries and their total are shown, including a no-results state
- WHEN a visitor opens `/find/[rtrId]`
- THEN an exact known RTR ID opens the corresponding public profile, including an
  unlisted player, and an unknown ID shows a not-found state.

#### Scenario: Find the signed-in player's position
- GIVEN Migs is signed in and qualifies at fixture position 128
- THEN a portrait and neutral surface card with an accent border shows that position
- WHEN Show my row is selected
- THEN enough pages load to reveal and focus Migs's row
- AND that row has the prototype's accent background, border and You chip.

### Requirement: Public profiles, rank and game history

The app SHALL use public profile projections that exclude account contacts and
credentials. Profile identity, shared rank, eligibility, recent games and optional
about information SHALL use components from `@rotra/ui` and prototype layouts.

#### Scenario: Follow profile destinations
- WHEN a visitor opens a known public profile
- THEN identity and RTR ID, shared rank, eligibility and recent games are displayed
- AND Copy copies the RTR ID with feedback
- AND rank details open `/players/[playerId]/rank`
- AND All games opens `/players/[playerId]/games`.

#### Scenario: View rank and history
- WHEN a visitor opens `/rank` or a player's rank route
- THEN the nine-level ladder, eligibility explanation and applicable provisional,
  established, reassessment or updating state are shown
- WHEN a visitor opens game history
- THEN valid finalized sessions group games with format, partners, opponents,
  result and optional score, distinguishing counted, fun and partial games
- AND an unknown player does not silently display another player's data.

### Requirement: Query and connectivity states

The leaderboard, rank and history SHALL present loading, empty, error, saved-copy
and refetch states. Cached content SHALL remain usable when offline; actions that
need connectivity SHALL report that limitation. Rankings SHALL use existing fixture
ordering and eligibility rules; this work SHALL NOT invent a numerical rating engine.

#### Scenario: Exercise query states
- WHEN the development controls select loading, an error or no qualifying players
- THEN the leaderboard shows the corresponding state and recovery action
- WHEN a previously loaded screen loses connectivity
- THEN saved content and the offline indication remain visible
- WHEN a refetch completes
- THEN the current data and saved-copy metadata refresh.

### Requirement: Prototype controls

The development-only Prototype sheet SHALL match the reference's scrollable body
and fixed Done footer. It SHALL expose account controls, Migs's rank scenarios,
offline mode, leaderboard scenarios and editable existing ranking settings.

#### Scenario: Change a scenario
- WHEN a rank or leaderboard option changes
- THEN dependent queries refresh to reflect it
- WHEN a user signs in or out through the sheet
- THEN account state and navigation update
- WHEN demo data is reset
- THEN fixture data, account state and development toggles reset.

#### Scenario: Features not yet implemented
- THEN contact-change requests and registration previews SHALL NOT imply a completed
  claim or contact workflow; registration actions remain unavailable
- AND reset-link previews open the implemented mock reset routes.

### Requirement: Mock sign-in and password recovery

The app SHALL provide `/login`, `/forgot-password` and `/reset-password/[token]`
using prototype forms and in-memory fetchers. This work SHALL NOT deliver email,
connect a real identity provider or retain submitted player passwords.

#### Scenario: Sign in as the fixture player
- WHEN the visitor supplies Migs's fixture phone number or email and a nonempty password
- THEN the mock account signs in and opens a safe local return destination or Migs's profile
- AND phone input formats as typed, passwords support Show/Hide, required fields are
  validated, pending submission is disabled and errors preserve input
- AND unknown credentials receive a generic error
- AND offline sign-in is blocked with an explanation.

#### Scenario: Request and use a reset link
- WHEN any syntactically valid email requests password recovery
- THEN the same acknowledgement appears for known and unknown addresses and states
  that the prototype sends no email
- WHEN a valid mock reset link receives matching nonempty passwords
- THEN the link becomes used and the visitor returns to sign-in with confirmation
- AND used or expired links show the invalid-link state.

## Remaining scope

Private account controls, profile editing, player ID/QR, contact-change requests,
registration at `/claim/[token]`, production authentication, email delivery and
persistence remain in their own tickets. Public profile and access work above does
not complete the whole P02 or P03 epics. Ranking normalization and rolling-window
policy decisions remain governed by the business open decisions.

## Sources

- `docs/screens/product/modules/player-information/ranking-history.md`
- `docs/screens/product/modules/player-information/profile.md`
- `docs/screens/product/modules/player-information/access-registration.md`
- `docs/business_logic/product/player-information/modules/ranking/README.md`
- `app/mocksups-app/player-app/rotra-player.html`
- `apps/player/AGENTS.md`
