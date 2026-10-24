## MODIFIED Requirements

### Requirement: Protected-shell onboarding gate
The protected layout SHALL redirect to `/onboarding` when the current profile is not an active admin, is not a tester account, and `onboardingCompleted` is not true. This SHALL apply equally to email/password and Facebook-authenticated regular users.

#### Scenario: New email player opens the dashboard
- GIVEN a signed-in email/password player with `onboardingCompleted` false
- AND the player is not an active admin and not a tester
- WHEN they request `/dashboard`
- THEN the server redirects to `/onboarding`

## Source

- `apps/client/src/app/(protected)/layout.tsx`
- `apps/client/src/lib/server/current-profile.ts`
