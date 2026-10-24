# 20 — Player Onboarding

## Overview

The player onboarding wizard is a mandatory, non-closeable multi-step screen that is shown on every app open until the player completes it. It replaces the previous two-route design (`/onboarding/phone` + `/onboarding/profile`) with a single unified wizard at `/onboarding` that collects all information needed to fully populate the user profile and playing profile in one continuous flow.

The wizard opens with a personalised welcome greeting and cannot be dismissed, skipped, or navigated away from until all steps are completed and the final payload is accepted by the server.

---

## 20.1 Route & Access Guard

| Property | Value |
|---|---|
| Route | `/onboarding` |
| Access | Any authenticated user where `profiles.onboarding_completed = false` |
| Guard condition | `profiles.onboarding_completed === false` |
| Bypass allowed | No — no close button, no back-to-home link, no swipe-to-dismiss |
| Redirect (authenticated, completed) | `/home` |
| Redirect (unauthenticated) | `/login` |

The guard is evaluated **server-side** on every authenticated request. If `onboarding_completed = false`, the server redirects to `/onboarding` regardless of the originally requested route. Once `onboarding_completed = true`, this route permanently redirects to `/home`.

### Greeting Behaviour

Every time the user opens the app with `onboarding_completed = false`, the wizard is shown starting at the **Welcome screen (Step 0)**. The app does not resume mid-wizard from a previous session; it always starts at the beginning. The welcome screen acknowledges the returning state with copy like:

> *"Hey [name], welcome back! Let's finish setting up your profile — it only takes a minute."*

On first-ever open after signup, the greeting is:

> *"Hey [name], you're almost in! Let's set up your profile."*

The distinction is tracked by whether `profiles.phone` is already populated (meaning the user has previously seen the wizard but not finished it).

---

## 20.2 Position in the Auth Flow

```
1. User signs in via Facebook Login or Email Invitation path
2. Supabase creates auth.users row; handle_new_user() trigger fires; profiles row seeded
3. Session issued
4. App evaluates onboarding_completed on every open:
   → onboarding_completed = false → redirect to /onboarding
   → onboarding_completed = true  → redirect to /home
5. Player completes the 9-step wizard (Steps 0–8)
6. Server receives atomic payload, validates all fields
7. Server sets profiles.onboarding_completed = true
8. App redirects to /home
```

---

## 20.3 Wizard Structure

The onboarding is a **9-step linear wizard** (Step 0 is the welcome screen; Steps 1–8 collect data). A progress indicator shows steps 1–8 only (the welcome screen is not counted in the progress bar).

Players may navigate **back** between steps 1–8; back navigation preserves all entered data in local wizard state. There is no back button on Step 0 and no back button on Step 1 (going back from Step 1 would return to the welcome screen, which would be confusing; the user should simply re-read the previous step if needed).

The **Next** button on each step is disabled until that step's validation passes. The **Finish** button on Step 8 is disabled until all steps are valid.

| Step | Screen title | Fields collected | Stored as |
|------|-------------|-----------------|-----------|
| 0 | Welcome / Greeting | — | — |
| 1 | Your name | Display name | `profiles.name` |
| 2 | Your phone number | Phone number | `profiles.phone` |
| 3 | Your experience | Age; Playing since year | `profiles.age`; `profiles.playing_since` / `profiles.playing_since_less_than_one_year` |
| 4 | Your level | Self-declared playing level | `profiles.playing_level` |
| 5 | How you play | Format preference | `profiles.format_preference` |
| 6 | Your court position | Court position | `profiles.court_position` |
| 7 | Your play style | Play mode | `profiles.play_mode` |
| 8 | Your track record | Tournament wins last year | `profiles.tournament_wins_last_year` |

---

## 20.4 Step Definitions

### Step 0 — Welcome / Greeting (non-interactive)

**Purpose:** Orient the player, set expectations for the wizard, and acknowledge returning users who have opened the app without finishing.

| Property | Value |
|---|---|
| Interaction | Single "Let's go" / "Continue" button only |
| Close / dismiss | Not available — no X, no skip, no swipe |
| Progress bar | Hidden on this screen |

**Copy variants:**

| Condition | Heading | Sub-copy |
|---|---|---|
| First-ever open | "You're almost in, [name]!" | "Set up your profile in under 2 minutes and start playing." |
| Returning (phone not yet set) | "Welcome back, [name]!" | "You still need to finish your profile. It only takes a minute." |
| Returning (phone already set) | "Hey [name], still here!" | "Just a few more questions and you're ready to play." |

---

### Step 1 — Your Name

**Purpose:** Confirm or correct the display name seeded from Facebook.

| Property | Value |
|---|---|
| Input type | Text input (pre-filled from `profiles.name`) |
| Min length | 2 characters |
| Max length | 40 characters |
| Allowed characters | Letters, spaces, hyphens, apostrophes |
| Validation fires | On blur and on attempt to advance |
| Error copy | "Name must be at least 2 characters." / "Name contains invalid characters." |
| Privacy | Public — shown in queue, leaderboard, and profile views |

The value entered here replaces `profiles.name` and is editable later from Profile Settings.

---

### Step 2 — Your Phone Number

**Purpose:** Collect a private contact number for account recovery and future in-app communication features.

| Property | Value |
|---|---|
| Input type | Phone number input with country code selector |
| Format validation | E.164 format (e.g. +63 912 345 6789) |
| Default country | Auto-detected from device locale |
| Validation fires | On blur and on attempt to advance |
| Error copy | "Please enter a valid phone number." |
| Privacy | Private — never shown on public profile or shared with other players |

Phone number is editable later from Profile Settings.

---

### Step 3 — Your Experience

**Purpose:** Capture age (for analytics and future bracket features) and playing history (shown publicly as experience context).

#### Age

| Property | Value |
|---|---|
| Input type | Scrollable integer picker |
| Range | 13–99 |
| Default | No pre-selection |
| Validation | Integer within range |
| Error copy | "Please select your age." |
| Privacy | Private — never shown on public profile |

#### Playing Since

| Property | Value |
|---|---|
| Input type | Year picker + "Less than 1 year" toggle option |
| Year range | 1960 – current year |
| Special option | "Less than 1 year" (stored as `playing_since = null`, `playing_since_less_than_one_year = true`) |
| Default | No pre-selection |
| Validation | Must select a year or "Less than 1 year" |
| Error copy | "Please tell us when you started playing." |
| Public display | "Playing since [YYYY]" or "Playing for less than a year" |

Both fields are required on this step. The Next button is disabled until both are provided.

---

### Step 4 — Your Level

**Purpose:** Capture the player's self-declared skill tier. This is the primary signal used for session matching until enough external ratings accumulate.

| Option | Label | Internal Value |
|--------|-------|----------------|
| Beginner | Beginner | `beginner` |
| Intermediate | Intermediate | `intermediate` |
| Advanced | Advanced | `advanced` |

| Property | Value |
|---|---|
| Input type | Single-select card group |
| Default | No pre-selection |
| Validation | Must select exactly one |
| Error copy | "Please select your playing level." |
| Public display | Shown on the public profile and in queue session player lists |

Playing level is editable later from Profile Settings.

---

### Step 5 — How You Play (Format Preference)

**Purpose:** Capture whether the player prefers singles, doubles, or both formats.

| Option | Label | Internal Value |
|--------|-------|----------------|
| Singles only | Singles | `singles` |
| Doubles only | Doubles | `doubles` |
| Both | Both | `both` |

| Property | Value |
|---|---|
| Input type | Single-select chip group |
| Default | No pre-selection |
| Validation | Must select exactly one |
| Error copy | "Please select your format preference." |
| Public display | Shown in the Play Style section of the public profile |

Format preference is editable later from Profile Settings.

---

### Step 6 — Your Court Position

**Purpose:** Capture the player's preferred court position in doubles play. Used by Que Masters when forming balanced teams.

| Option | Label | Internal Value |
|--------|-------|----------------|
| Front | Front Player | `front` |
| Back | Back Player | `back` |
| All-Around | All-Around Player | `both` |

| Property | Value |
|---|---|
| Input type | Single-select chip group |
| Default | No pre-selection |
| Validation | Must select exactly one |
| Error copy | "Please select your court position." |
| Public display | Shown in the Play Style section of the public profile |

Note: The internal value `both` maps to the "All-Around" UI label. The label "All-Around" must not be persisted to the database (see RULE-053).

Court position is editable later from Profile Settings and the Play Style section of the own-profile screen.

---

### Step 7 — Your Play Style (Play Mode)

**Purpose:** Capture whether the player approaches the game competitively, socially, or both.

| Option | Label | Internal Value |
|--------|-------|----------------|
| Competitive | Competitive | `competitive` |
| Social | Social (fun games) | `social` |
| Both | Mix of both | `both` |

| Property | Value |
|---|---|
| Input type | Single-select chip group |
| Default | No pre-selection |
| Validation | Must select exactly one |
| Error copy | "Please select your play style." |
| Public display | Shown in the Play Style section of the public profile |

Play mode is editable later from Profile Settings.

---

### Step 8 — Your Track Record (Tournament Wins)

**Purpose:** Capture recent competitive achievement. Shown as a contextual badge on the public profile.

| Option | Label | Internal Value |
|--------|-------|----------------|
| No wins | No wins this year | `none` |
| 1–3 | 1–3 tournament wins | `1_to_3` |
| 4 or more | 4+ tournament wins | `4_plus` |

| Property | Value |
|---|---|
| Input type | Single-select chip group |
| Default | No pre-selection |
| Validation | Must select exactly one |
| Error copy | "Please select your recent tournament wins." |
| Public display | Shown as a badge on the public profile (hidden if `none`) |
| Time scope | Rolling 12 months at time of registration |
| Button label | "Finish" (instead of "Next") |

`tournament_wins_last_year` is a snapshot value at time of submission. It is not automatically updated by the system. Players may update it from Profile Settings. A future notification (Phase 2+) will prompt players at account anniversary to refresh this value.

---

## 20.5 Validation Rules

- Every step must pass its own validation before the Next / Finish button activates.
- Inline validation fires on attempt to advance to the next step. For text inputs (Steps 1 and 2), validation also fires on blur.
- The wizard cannot be submitted with any step in an invalid state.
- If the player navigates back and changes a value, the updated value is carried forward and included in the final submission payload.
- Server-side validation applies the same rules as the client; if server validation fails, a toast error is shown and the player remains on Step 8 with the Finish button re-enabled.

---

## 20.6 Non-Closeable Behaviour

The onboarding wizard is designed to be inescapable until completion:

| User action | Result |
|---|---|
| Tapping the system back button (Android) | Navigates to previous wizard step; does not exit the wizard |
| Swiping back (iOS) | Navigates to previous wizard step; does not exit the wizard |
| Minimising / backgrounding the app | Wizard state is maintained; reopening the app restarts at Step 0 (welcome) |
| Force-quitting and relaunching | Server guard detects `onboarding_completed = false`; redirects to `/onboarding` |
| Navigating directly to any route (e.g. `/home`) | Server-side guard intercepts and redirects to `/onboarding` |
| Tapping outside the wizard overlay | No effect — no dismiss-on-tap-outside behaviour |

There is no close button (X), no "Skip for now" link, and no back-to-home affordance anywhere in the wizard UI.

---

## 20.7 Data Submission

All fields from Steps 1–8 are submitted as a **single atomic API call** when the player taps "Finish" on Step 8. No partial saves occur between steps — wizard state is held client-side until final submission.

### Payload

```json
{
  "name": "string",
  "phone": "string (E.164)",
  "age": 25,
  "playing_since": 2015,
  "playing_since_less_than_one_year": false,
  "playing_level": "beginner | intermediate | advanced",
  "format_preference": "singles | doubles | both",
  "court_position": "front | back | both",
  "play_mode": "competitive | social | both",
  "tournament_wins_last_year": "none | 1_to_3 | 4_plus"
}
```

### Server actions on receipt

1. Validate all fields server-side (same rules as client-side)
2. Update `profiles` record with all fields
3. Set `profiles.onboarding_completed = true`
4. If `profiles.profile_completed_bonus_claimed = false` and all completeness conditions are met, insert a `+20 EXP` transaction and set `profile_completed_bonus_claimed = true`
5. Return `200 OK` with the updated profile object
6. Client redirects to `/home`

### Error handling

If the API call fails, a toast error is shown ("Something went wrong. Please try again.") and the player remains on Step 8. The Finish button returns to its active state. No data is partially saved.

---

## 20.8 Skip / Bypass Rules

| Scenario | Behaviour |
|---|---|
| Player closes app mid-wizard | On next open, shown Step 0 (welcome) again; no partial state persisted server-side |
| Player navigates to any other route | Server-side guard redirects to `/onboarding` |
| Player tries to access `/home` directly | Redirected to `/onboarding` |
| Player completes wizard | `onboarding_completed = true`; wizard never shown again |
| Player registered before this feature | `onboarding_completed = true` by default (migration); all new fields default to `null`; profile shows "Not set" with a "Complete your profile" prompt in Profile Settings |

---

## 20.9 Legacy Accounts (Pre-feature Migration)

Players who registered before the onboarding wizard is shipped are **not forced through the wizard**. Their records are set to `onboarding_completed = true` during the migration, and all new fields default to `null`.

Their public profile shows "Not set" where these fields would appear, with a contextual inline prompt: "Complete your profile" linking to the relevant section of Profile Settings.

---

## 20.10 Field Editability After Onboarding

| Field | Editable after? | Location |
|-------|----------------|----------|
| Display name | Yes | Profile Settings |
| Phone number | Yes | Profile Settings (private) |
| Age | Yes | Profile Settings (private) |
| Playing since | Yes | Profile Settings |
| Playing level | Yes | Profile Settings |
| Format preference | Yes | Profile Settings / Play Style section |
| Court position | Yes | Profile Settings / Play Style section |
| Play mode | Yes | Profile Settings / Play Style section |
| Tournament wins last year | Yes | Profile Settings |

---

## 20.11 Canonical Rules

| ID | Rule |
|----|------|
| RULE-050 | A player account with `onboarding_completed = false` must be redirected to `/onboarding` on every authenticated request until the wizard is completed. |
| RULE-051 | The onboarding wizard payload must be submitted atomically; partial field saves during the wizard are not permitted. |
| RULE-052 | `profiles.age` is private and must never appear on the public profile, leaderboard rows, or any player comparison view. |
| RULE-053 | The `both` value is the canonical DB identifier for the "All-Around" court position. The UI label "All-Around" must not be persisted to the database. |
| RULE-054 | `tournament_wins_last_year` reflects the player's self-reported state at the time of submission and is not automatically recalculated by the system. |
| RULE-055 | The onboarding wizard has no close button, no skip link, and no dismiss-on-back-tap behaviour. The only exit is successful wizard completion. |
| RULE-056 | On every app open where `onboarding_completed = false`, the wizard must start at Step 0 (the welcome/greeting screen), not at the last incomplete step. |
| RULE-057 | `profiles.phone` is private and must never be surfaced on the public profile or to other players. |
| RULE-058 | The wizard progress indicator must show Steps 1–8 only. The welcome screen (Step 0) is not counted in the progress bar. |
| RULE-059 | The "playing_since_less_than_one_year" flag and a null `playing_since` value are the canonical representation for players who have been playing for less than a year. Both must be set together. |
| RULE-060 | The `play_mode` field captures player intent and temperament only; it has no effect on queue matching logic or session eligibility. |
