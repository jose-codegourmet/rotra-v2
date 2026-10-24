# Onboarding Specification

## Purpose

Client-app first-run profile wizard for regular players. Admins and testers skip it. Incomplete non-admin, non-tester players cannot use the protected shell until they submit the wizard.

## Requirements

### Requirement: Protected-shell onboarding gate
The protected layout SHALL redirect to `/onboarding` when the current profile is not an active admin, is not a tester account, and `onboardingCompleted` is not true.

#### Scenario: New Facebook player opens the dashboard
- GIVEN a signed-in player with `onboardingCompleted` false
- AND the player is not an active admin and not a tester
- WHEN they request a `(protected)` route such as `/dashboard`
- THEN the server redirects to `/onboarding`

#### Scenario: Active admin skips onboarding
- GIVEN a signed-in profile with an admin role and `adminIsActive` true
- WHEN they request a `(protected)` route
- THEN they are not redirected to `/onboarding`

#### Scenario: Tester skips onboarding
- GIVEN a signed-in profile with `isTesterAccount` true
- WHEN they request a `(protected)` route
- THEN they are not redirected to `/onboarding`

### Requirement: Onboarding route access
The onboarding layout SHALL redirect active admins to `/dashboard`. It SHALL redirect any profile with `onboardingCompleted` true to `/home`. Testers who are not completed may still open `/onboarding` because the layout does not redirect testers by tester flag.

#### Scenario: Completed player returns to /onboarding
- GIVEN `onboardingCompleted` is true
- WHEN they request `/onboarding`
- THEN the server redirects to `/home`

#### Scenario: Active admin opens /onboarding
- GIVEN an active admin profile
- WHEN they request `/onboarding`
- THEN the server redirects to `/dashboard`

### Requirement: Nine-step client wizard
The wizard SHALL run nine client-only steps (0–8) and MUST initialize at step 0 on mount. Progress dots SHALL be hidden on step 0. The footer Back control SHALL appear only from step 2 onward. Next/Finish SHALL stay disabled until the current step validates.

| Step | Screen | Required input |
|------|--------|----------------|
| 0 | Welcome | None |
| 1 | Name | 2–40 characters matching `/^[\p{L}\s'-]{2,40}$/u` |
| 2 | Phone | Valid E.164 (`+` and 7–15 digits) |
| 3 | Experience | Age 13–99; playing-since year **or** less-than-one-year |
| 4 | Level | `beginner` \| `intermediate` \| `advanced` |
| 5 | Format | `singles` \| `doubles` \| `both` |
| 6 | Court position | `front` \| `back` \| `both` |
| 7 | Play mode | `competitive` \| `social` \| `both` |
| 8 | Tournament wins | `none` \| `1_to_3` \| `4_plus` |

Welcome copy SHALL be `return_has_phone` when the profile already has a phone, `first` when the profile was created within the last 24 hours, otherwise `return_no_phone`.

#### Scenario: Wizard starts at welcome
- GIVEN a player who is allowed on `/onboarding`
- WHEN the wizard mounts
- THEN it shows step 0
- AND the progress dots are hidden

#### Scenario: Name step rejects invalid characters
- GIVEN the player is on the name step
- WHEN they enter a name that fails the Unicode letter/space/`'`/`-` pattern
- THEN Next remains disabled

### Requirement: Atomic onboarding submit
`POST /api/onboarding/complete` MUST require a current profile. It SHALL reject already-completed profiles with HTTP 400. It SHALL validate the full payload server-side and persist name, phone, age, playing-since fields, level, format, court position, play mode, tournament wins, and `onboardingCompleted = true` in one transaction.

#### Scenario: First successful submit
- GIVEN a signed-in player with `onboardingCompleted` false
- WHEN they post a valid payload to `/api/onboarding/complete`
- THEN the profile is updated and marked completed
- AND the client navigates to `/home`

#### Scenario: Submit without a profile
- GIVEN no current profile
- WHEN `/api/onboarding/complete` is called
- THEN the API returns HTTP 401 `{ error: "Unauthorized" }`

#### Scenario: Submit after already completed
- GIVEN `onboardingCompleted` is already true
- WHEN `/api/onboarding/complete` is called
- THEN the API returns HTTP 400 `{ error: "Onboarding already completed." }`

#### Scenario: Invalid payload
- GIVEN a signed-in incomplete player
- WHEN they post a body that fails `validateOnboardingPayload`
- THEN the API returns HTTP 400 with the validation message

### Requirement: One-time profile-completed EXP bonus
If `profileCompletedBonusClaimed` is false at submit time, the same transaction SHALL increment `expTotal` by 20, set `profileCompletedBonusClaimed` true, and insert an `expTransaction` with `amount` 20 and `reason` `profile_completed`. If the bonus was already claimed, the transaction MUST NOT grant it again.

#### Scenario: First completion grants bonus
- GIVEN `profileCompletedBonusClaimed` is false
- WHEN onboarding completes successfully
- THEN EXP increases by 20
- AND an `expTransaction` with reason `profile_completed` is written

#### Scenario: Bonus already claimed
- GIVEN `profileCompletedBonusClaimed` is already true
- WHEN a completion transaction would otherwise succeed
- THEN no additional EXP or `expTransaction` is granted

## Documented product rules

The following rules come from `docs/business_logic/client_app/20_onboarding.md`. They are product intent and MUST NOT be treated as implemented unless a Current requirement above already states the same fact. Current requirements already describe the nine-step wizard, validation, admin/tester skip, and +20 EXP bonus.

### Requirement: Non-dismissable wizard for regular players
For non-admin, non-tester players with `onboarding_completed = false`, the wizard SHALL NOT be dismissable, skippable, or swipe-closed. The server-side guard SHALL redirect to `/onboarding` on every authenticated request until completion. The wizard SHALL always restart at Step 0 on each app open (no mid-wizard resume). Back SHALL be unavailable on Steps 0 and 1.

#### Scenario: Deep link while incomplete
- GIVEN `onboarding_completed` is false and the player is not an admin or tester
- WHEN they request `/profile`
- THEN they are redirected to `/onboarding`

### Requirement: Phone and age privacy
Phone SHALL be private (account recovery / operational contact). Age SHALL be 13–99 and never shown publicly. Playing-since and tournament-wins-last-year (`none` / `1–3` / `4+`) SHALL be public; tournament badge SHALL be omitted when `none`.

> `00_ubiquitous_language.md` uses court position Both; `05_player_profile.md` uses All-Around. Current onboarding stores `front` | `back` | `both`.

#### Scenario: Age stays private
- GIVEN a completed profile with age 28
- WHEN another player opens the public profile
- THEN age is not shown

## Source

- `apps/client/src/app/(protected)/layout.tsx`
- `apps/client/src/app/(onboarding)/layout.tsx`
- `apps/client/src/app/(onboarding)/onboarding/page.tsx`
- `apps/client/src/app/api/onboarding/complete/route.ts`
- `apps/client/src/lib/onboarding/validate-payload.ts`
- `apps/client/src/lib/onboarding/onboarding-form-schema.ts`
- `apps/client/src/components/modules/onboarding/OnboardingWizard/OnboardingWizard.tsx`
- `apps/client/src/components/modules/onboarding/OnboardingFooter/OnboardingFooter.tsx`
- `packages/db/prisma/models_profile.prisma`
