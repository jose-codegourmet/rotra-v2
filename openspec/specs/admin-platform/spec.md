# Admin Platform Specification

## Purpose

Admin pages for dashboard, kill switches, platform config, analytics, MMR, skills, and moderation. These routes exist and require an admin session, but they render mock or in-memory data. They do not persist configuration or enqueue real moderation work.

## Requirements

### Requirement: Protected mock pages
`/dashboard`, `/kill-switches`, `/platform-config`, `/analytics`, `/mmr-management`, `/skills-management`, and `/moderation` SHALL be reachable only through the admin auth gates. They MUST NOT call dedicated persistence APIs for their domain data.

#### Scenario: Signed-out visitor
- GIVEN no admin session
- WHEN they request `/kill-switches`
- THEN middleware redirects to `/login`

### Requirement: Dashboard uses mock KPIs
`/dashboard` SHALL render KPI cards, an activity feed, and attention counts from `MOCK_*` constants. Links to other admin modules MAY be real routes. Counts MUST NOT come from a live metrics API.

#### Scenario: Dashboard attention cards
- GIVEN a signed-in admin
- WHEN they open `/dashboard`
- THEN pending-approvals and moderation counts are computed from mock arrays

### Requirement: Kill switches are local UI state
`/kill-switches` SHALL render `MOCK_KILL_SWITCHES`. Toggles SHALL update React local state only and MUST NOT persist. The page SHALL state that toggles are not persisted.

#### Scenario: Toggle a kill switch
- GIVEN the kill-switches page
- WHEN an admin flips a switch
- THEN only local component state changes
- AND no kill-switch API is called

### Requirement: Platform config and analytics are display-only
`/platform-config` SHALL render a mock key/value table. Edit controls SHALL have no persistence handlers. `/analytics` SHALL render mock KPIs, a static chart, and a mock top-clubs table with no analytics API.

#### Scenario: Platform config edit
- GIVEN the platform-config page
- WHEN an admin uses an edit control
- THEN no platform-config row is written to the database

### Requirement: MMR and skills tables are in-memory
`/mmr-management` SHALL edit in-memory defaults from `constants/mmr-asymmetry-config.ts` and SHALL state that no API exists. `/skills-management` SHALL edit in-memory defaults from `constants/match-exp-config.ts`. Reloading the page SHALL restore the constants, not saved values.

#### Scenario: Reload after editing MMR
- GIVEN an admin changed a local MMR table value
- WHEN they reload `/mmr-management`
- THEN the table shows the shipped constants again

### Requirement: Moderation queue is mock
`/moderation` SHALL render `MOCK_MODERATION`. View/Resolve actions SHALL be non-functional. `?player=&tab=` MAY show `ModerationPlayerFocusBanner` with the player id and copy that full tooling is future. Customer detail “Take action” MAY deep-link here.

#### Scenario: Resolve is inert
- GIVEN a mock moderation row
- WHEN the admin clicks Resolve
- THEN no moderation record is updated in the database

## Documented product rules

The following rules come from `docs/business_logic/admin_app/02_kill_switches.md`, `03_environment_management.md`, `05_platform_config.md`, and `07_mmr_and_skills_management.md`. They are product intent and MUST NOT be treated as implemented unless a Current requirement above already states the same fact. Current pages for these modules are mock or in-memory.

### Requirement: Kill switches persist and fail closed
Documented kill switches SHALL persist in platform config and take effect without a deploy. Client features SHALL hide or show a graceful fallback, not an error screen. Documented keys include `auth.facebook_login`, `auth.new_registrations`, `clubs.*`, `sessions.*`, `umpire.*`, and `ratings.*` as listed in `02_kill_switches.md`.

#### Scenario: Ratings kill switch
- GIVEN `ratings.post_match_review` is OFF
- WHEN a match ends
- THEN the review prompt is skipped and the match can complete on score only

### Requirement: Environment isolation
Each Admin App instance SHALL manage only its paired environment (dev / staging / prod). There SHALL be no in-app cross-environment switch. Staging config SHALL NOT affect production. Prod destructive/config actions SHALL require an explicit production confirmation. Environment indicator colors: dev grey, staging amber, prod red.

#### Scenario: Staging EXP change
- GIVEN an admin changes EXP rates in staging
- WHEN production calculates EXP
- THEN production uses production config

### Requirement: Platform config guardrails
EXP rate, MMR asymmetry, calibration, and EXP-tier threshold changes SHALL apply to future transactions only. Historical ledgers SHALL NOT be rewritten. Tier thresholds SHALL NOT be lowered below the highest sub-rank any player has achieved. Apex / Apex Predator SHALL be position-based (`apex.min_exp_to_qualify` default 27,000; snapshot interval default 24h). Config saves SHALL require password confirmation. Bulk skill-dimension edits SHALL require Super Admin. Dimension IDs SHALL be immutable; retiring a dimension SHALL hide it without deleting history.

#### Scenario: Demoting threshold blocked
- GIVEN a player has reached Warrior 1
- WHEN an admin tries to raise the Warrior 1 minimum above that player's EXP in a way that would demote them
- THEN the save is blocked

### Requirement: System threshold defaults
Documented platform defaults: no-show window 15 minutes, smart monitoring 90%, review window 24 hours, consistent-member sessions 3, rating unlock 5, win-rate unlock 5, advanced stats 20, global leaderboard min matches 20, reapply after rejection 30 days.

> `18` RULE-082 says there is no automatic no-show removal. The 15-minute value is a default alert window, not an automatic slot release.

#### Scenario: Review window default
- GIVEN platform config is at defaults
- WHEN a match completes
- THEN the documented review window is 24 hours

## Source

- `apps/admin/src/app/(protected)/dashboard/page.tsx`
- `apps/admin/src/app/(protected)/kill-switches/page.tsx`
- `apps/admin/src/app/(protected)/platform-config/page.tsx`
- `apps/admin/src/app/(protected)/analytics/page.tsx`
- `apps/admin/src/app/(protected)/mmr-management/page.tsx`
- `apps/admin/src/app/(protected)/skills-management/page.tsx`
- `apps/admin/src/app/(protected)/moderation/page.tsx`
- `apps/admin/src/constants/mock-admin-pages.ts`
- `apps/admin/src/constants/mmr-asymmetry-config.ts`
- `apps/admin/src/constants/match-exp-config.ts`
