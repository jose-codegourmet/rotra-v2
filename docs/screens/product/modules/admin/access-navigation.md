# Admin access and workspace

**Surfaces:** `A-LOGIN`, `A-WORKSPACE`.

**Sources:** [v1 Admin scope](../../../../business_logic/product/admin/README.md).

## A-LOGIN — Platform-owner access

Admin is a separate internal audience. A club credential or registered player credential does not grant platform-owner privileges.

Proposed credential form: email and password, following the existing Admin-auth baseline. The reset discussion did not choose a new Admin authentication/recovery method; final provider/session policy remains to be confirmed. Do not invent a public Admin registration, shared club gate password, MFA requirement, or named staff-role management feature.

Controls: required credential inputs, accessible password visibility, Sign in, bounded access help. Loading prevents duplicate requests. Invalid credentials show a safe form error. A valid session without platform authority shows Access denied, not the Admin shell with buttons hidden.

Admin mutations are online. Cached internal data must not become publicly available when a session expires. Retryable network failure is distinct from permission denial.

## A-WORKSPACE — Focused internal navigation

Proposed navigation:

- Clubs and licenses.
- Players.
- Contact-change requests.
- Ranking configuration.
- Feature flags.

The initial view can be the clubs list rather than a speculative analytics dashboard. Counts shown in navigation are actual records, not mock revenue, churn, active-user, moderation, or platform-health metrics.

Header identifies the authenticated platform account and sign-out control. Club operator actions remain attributable to their shared club account/device; Admin should not display invented individual manager names.

Each list/detail screen preserves search/filter context on return. Permission errors do not show partial privileged data. Unsaved form changes require deliberate dismissal; a failed save must not display a success toast or optimistic permanent value.

## Operational boundaries

There is no Admin winner/score editor, invalid-match reversal, lost-device manual reconstruction, or secret profile-rank override. Configuration controls change the approved algorithm settings, not individual match facts.

Existing old dashboards, moderation, payment collection, and kill-switch concepts are not automatically included. Feature flags are specified separately without inventing their catalog.

## Acceptance examples

- A club account reaching an Admin URL receives access denial with no private player data.
- Losing connectivity prevents an activation/approval from being reported as saved.
- The workspace remains usable without an invented analytics home page.

## Mock implementation notes — A01

The A01 branch implements presentational access components and the owner workspace shell over a
browser-readable mock session marker. This is not real authentication. Passwords stay out of Redux
and the TanStack mutation variables/cache. Leaving the owner session clears cached internal queries
and mutations; only the public session projection is repopulated. Developer controls are omitted
from production for Admin.

The mock owner lands on `/clubs`. Navigation targets are `/clubs`, `/players`,
`/requests/contact-changes`, `/requests/club-names`, `/settings/ranking`, and
`/settings/feature-flags`; detail routes belong to A02–A04. Until those screens land, unmatched
links show the Admin not-found state with no placeholder records or counts.

Invalid-credential copy from ticket #186 is **“Email or password is incorrect.”** This copy awaits
product-owner confirmation. Offline sign-in uses **“Signing in needs an internet connection.”**
The final Admin auth/provider/session policy remains open.

For this delivery, the product owner requested no lint, type-check, or build checks. Runtime,
Storybook, keyboard, and visual verification have not been performed.
