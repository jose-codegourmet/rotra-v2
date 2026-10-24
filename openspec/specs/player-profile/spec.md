# Player Profile Specification

## Purpose

Client profile pages at `/profile` (own) and `/profile/[userId]` (any player). A public-profile API returns real profile fields. Most cards (stats, gear, matches, skill, hardcoded rank) still render mock data.

Account editing lives in `settings`.

## Requirements

### Requirement: Authenticated profile pages
`/profile` and `/profile/[userId]` SHALL live under the protected shell (session required; incomplete non-admin, non-tester players are redirected to onboarding).

#### Scenario: Signed-out visitor
- GIVEN no Supabase session
- WHEN they request `/profile`
- THEN middleware redirects to `/login` with a `next` parameter

### Requirement: Public profile API
`GET /api/profile/[userId]` MUST require a Supabase session (HTTP 401 otherwise). It SHALL return `id`, `name`, `avatarUrl`, `playingLevel`, `formatPreference`, `courtPosition`, `playMode`, `mmr`, `expTotal`, `onboardingCompleted`, `tags` (`id`, `slug`, `label`, `assignedAt`), `createdAt`, and `updatedAt`. A missing profile row SHALL return HTTP 404.

#### Scenario: Existing profile
- GIVEN a signed-in viewer and a profile id that exists
- WHEN they GET `/api/profile/[userId]`
- THEN the API returns that public profile DTO including tags

#### Scenario: Unknown profile id
- GIVEN a signed-in viewer
- WHEN they GET `/api/profile/[userId]` for a missing id
- THEN the API returns HTTP 404

#### Scenario: Unauthenticated API call
- GIVEN no Supabase session
- WHEN they GET `/api/profile/[userId]`
- THEN the API returns HTTP 401

### Requirement: Own profile page composition
`/profile` SHALL show a page header and an “Edit account” link to `/settings/account`. The left column SHALL load `useProfile(auth.user.id)` from the public profile API. The right column SHALL use the Redux auth user and MUST NOT require the public profile API to render. Left-column name/avatar come from the API when loaded.

#### Scenario: Own profile header
- GIVEN a signed-in player on `/profile`
- WHEN the page renders
- THEN an edit-account link to `/settings/account` is shown

### Requirement: Other-player profile page composition
`/profile/[userId]` SHALL not show the own-profile header/edit link. Both columns SHALL call `useProfile(userId)`. While loading they SHALL show skeletons. On load or missing-player error the columns SHALL render nothing (`null`) instead of a dedicated error page.

#### Scenario: Other player profile loads
- GIVEN a signed-in viewer
- WHEN they open `/profile/[userId]` for an existing player
- THEN both columns request `GET /api/profile/[userId]`

#### Scenario: Profile not found in UI
- GIVEN `GET /api/profile/[userId]` returns 404
- WHEN the profile columns handle the error
- THEN they render no profile cards

### Requirement: Rank, stats, matches, and gear remain mock
`PlayerHeaderCard` SHALL pass hardcoded rank copy (`IRON 3` / `Warrior 2` pips). Play style, gear, stats, skill radar, match history, and advanced metrics SHALL read `MOCK_PLAYER` / `ADVANCED_STATS`. API fields such as `playingLevel`, `mmr`, and `tags` MAY be unused by those cards.

#### Scenario: Rank strip is not from MMR
- GIVEN any loaded profile page
- WHEN the header card renders
- THEN the displayed rank/tier is the hardcoded header values, not `mmr` from the API

## Documented product rules

The following rules come from `docs/business_logic/client_app/05_player_profile.md`. They are product intent and MUST NOT be treated as implemented unless a Current requirement above already states the same fact. Current pages still render mock stats, gear, matches, and rank.

### Requirement: Profile fields and visibility
Display name, photo, playing-since, play style, gear, and (after gates) stats SHALL be public. Phone SHALL be private to the player except Que Master and Club Owner operational contact. Age SHALL never be public. Payment records SHALL be Que Master / Club Owner only. Received text reviews SHALL be player-only after acknowledgment. Playing level is documented as public in `05` and as self-only in `00_ubiquitous_language.md` — both statements are recorded; this fold follows `05` for public display unless anti-sandbagging overrides it.

#### Scenario: Phone on public profile
- GIVEN a player has a phone number
- WHEN another player opens `/profile/[userId]`
- THEN phone is not shown

### Requirement: Play style is informational
Format (Singles / Doubles / Both), court position (Front / Back / All-Around), and play mode (Competitive / Social / Both) SHALL be informational only and MUST NOT affect queue priority or matching.

#### Scenario: Competitive preference
- GIVEN a player set play mode Competitive
- WHEN they join a Fun Games session
- THEN preference does not change admission or rotation

### Requirement: Gear showcase
Players MAY add multiple public items in Rackets, Shoes, and Bags. Each item SHALL act as a mini post (title, description, optional purchase links). Gear SHALL have no gameplay effect. Shoe fit type Standard is documented as future.

#### Scenario: Multiple rackets
- GIVEN a player adds two racket items
- WHEN their public profile is viewed
- THEN both items can appear in the gear showcase

### Requirement: Stat unlock gates
Win rate and skill rating SHALL show only after ≥ 5 scored matches; otherwise “Not enough data”. Advanced stats SHALL unlock after ≥ 20 completed matches. Rating trend SHALL compare the last 5 ratings to the prior 5 with a 0.3 threshold (Ascending / Stable / Descending). Sessions attended SHALL count distinct sessions where the player was Accepted and marked I Am In.

#### Scenario: New player stats
- GIVEN a player has 3 scored matches
- WHEN basic stats render
- THEN win rate and skill rating show “Not enough data”

## Source

- `apps/client/src/app/(protected)/profile/page.tsx`
- `apps/client/src/app/(protected)/profile/[userId]/page.tsx`
- `apps/client/src/app/api/profile/[userId]/route.ts`
- `apps/client/src/hooks/useProfile/client.ts`
- `apps/client/src/hooks/useProfile/server.ts`
- `apps/client/src/components/modules/profile/layout/ProfileLeftColumn.tsx`
- `apps/client/src/components/modules/profile/layout/ProfileRightColumn.tsx`
- `apps/client/src/constants/mock-player.ts`
- `apps/client/src/types/public-profile.ts`
