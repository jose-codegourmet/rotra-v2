# Settings Specification

## Purpose

Client settings. `/settings` is a mostly static hub. `/settings/account` is the implemented account surface: update display name, tester password change, and self-delete.

## Requirements

### Requirement: Settings hub is largely static
`/settings` SHALL render `SETTINGS_SECTIONS` plus a profile card (name/email from Redux auth) that links to `/profile`. Account items SHALL link to `/settings/account`. Preferences, privacy, and language items SHALL use `href="#"`. The hub Log Out and Delete Account buttons SHALL have no handlers. Working logout is the shell `LogoutDialogProvider`, not this hub button.

#### Scenario: Account links work
- GIVEN a signed-in player on `/settings`
- WHEN they open Profile Information or Password & Security
- THEN they navigate to `/settings/account`

#### Scenario: Hub logout is inert
- GIVEN a signed-in player on `/settings`
- WHEN they click the hub Log Out button
- THEN no sign-out runs from that control

### Requirement: Account page requires a profile
`/settings/account` SHALL call `getCurrentProfile()` and redirect to `/login` when missing. It SHALL pass `profileId`, `name`, `email`, `isTesterAccount`, and `isFacebookUser` (Supabase identity provider `facebook`) into the account view.

#### Scenario: Signed-out account page
- GIVEN no current profile
- WHEN `/settings/account` is requested
- THEN the server redirects to `/login`

### Requirement: Update display name
`PATCH /api/profile/me` SHALL require auth and a non-empty `name`. It MUST persist the name via `updateOwnPlayerName`. Email SHALL be shown read-only and MUST NOT be changeable in-app. Success SHALL toast, invalidate `["player-profile","me"]`, and refresh the route.

#### Scenario: Valid name update
- GIVEN a signed-in player
- WHEN they PATCH `/api/profile/me` with a valid name
- THEN the profile name is updated

#### Scenario: Invalid name
- GIVEN a signed-in player
- WHEN they PATCH an empty or invalid name
- THEN the API returns HTTP 400

### Requirement: Password change is tester-only
The password form SHALL render only when `isTesterAccount` is true. Facebook users SHALL see an informational panel instead. Regular non-Facebook, non-tester players SHALL see no password section. `POST /api/profile/me/change-password` MUST reject non-testers with HTTP 403. Testers SHALL update the password through Supabase (`updateUser`) with a minimum of 8 characters.

#### Scenario: Tester changes password
- GIVEN `isTesterAccount` is true
- WHEN they post a valid new password of 8+ characters
- THEN Supabase updates the auth user password

#### Scenario: Non-tester hits the password API
- GIVEN a non-tester profile
- WHEN they POST `/api/profile/me/change-password`
- THEN the API returns HTTP 403

### Requirement: Self-delete account
`DELETE /api/profile/me/delete` SHALL delete the profile row then the Supabase auth user. Active admin accounts MUST be rejected with HTTP 403. Foreign-key conflicts SHALL return HTTP 409 (`bad_state`) with a message that the account is linked to active clubs or sessions. The UI SHALL require typing the email (or name if no email) case-insensitively before submit. Success SHALL sign the user out and send them to `/login`.

#### Scenario: Player confirms deletion
- GIVEN a non-admin player who types their matching email
- WHEN they submit delete
- THEN the profile and auth user are deleted
- AND the client signs out and goes to `/login`

#### Scenario: Active admin cannot self-delete
- GIVEN an active admin profile
- WHEN they DELETE `/api/profile/me/delete`
- THEN the API returns HTTP 403

#### Scenario: Linked clubs or sessions block delete
- GIVEN foreign-key constraints prevent profile delete
- WHEN they DELETE `/api/profile/me/delete`
- THEN the API returns HTTP 409

## Source

- `apps/client/src/app/(protected)/settings/page.tsx`
- `apps/client/src/app/(protected)/settings/account/page.tsx`
- `apps/client/src/components/modules/settings/AccountSettingsView.tsx`
- `apps/client/src/constants/account-settings.ts`
- `apps/client/src/app/api/profile/me/route.ts`
- `apps/client/src/app/api/profile/me/change-password/route.ts`
- `apps/client/src/app/api/profile/me/delete/route.ts`
- `packages/db/src/player-profile-service.ts`
