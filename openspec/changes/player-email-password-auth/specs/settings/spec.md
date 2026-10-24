## MODIFIED Requirements

### Requirement: Password change for password-backed accounts
The password form SHALL render for authenticated accounts that are not Facebook-managed. Facebook users SHALL retain the informational provider panel. `POST /api/profile/me/change-password` MUST require a current profile and SHALL update the Supabase Auth password when the new password is at least 8 characters; it MUST NOT require tester status.

#### Scenario: Regular email user changes password
- GIVEN a signed-in non-Facebook, non-tester profile
- WHEN the user submits a valid new password of at least 8 characters
- THEN Supabase updates the auth user password

#### Scenario: Unauthenticated request changes password
- GIVEN no current profile
- WHEN `/api/profile/me/change-password` is called
- THEN the API returns HTTP 401

## Source

- `apps/client/src/components/modules/settings/AccountSettingsView.tsx`
- `apps/client/src/app/api/profile/me/change-password/route.ts`
