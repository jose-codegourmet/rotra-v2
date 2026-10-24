# Landing Specification

## Purpose

Public marketing site in `apps/landing`: coming-soon home, waitlist capture, and legal pages. No authentication.

## Requirements

### Requirement: Coming-soon home
`/` SHALL render the landing nav, hero, architecture grid, secondary CTA, and footer. The waitlist form on the page SHALL POST to `/api/waitlist`. There is no auth middleware.

#### Scenario: Anonymous visitor opens the site
- GIVEN an unauthenticated visitor
- WHEN they request `/`
- THEN the coming-soon landing page is served

### Requirement: Waitlist signup
`POST /api/waitlist` SHALL accept `{ email }`, validate with the shared email helper, and persist a lowercase-normalized row in `waitlist_signups`. Invalid email or invalid JSON SHALL return HTTP 400. A unique-constraint duplicate email SHALL still return `{ ok: true }` (idempotent). Other database errors SHALL return HTTP 500 with a generic message. The form SHALL show a thank-you state after `{ ok: true }`.

#### Scenario: New valid email
- GIVEN an email that is not already on the waitlist
- WHEN they POST `/api/waitlist`
- THEN a `waitlist_signups` row is created
- AND the response is `{ ok: true }`

#### Scenario: Duplicate email
- GIVEN that email already exists
- WHEN they POST `/api/waitlist` again
- THEN the API returns `{ ok: true }`
- AND no error is shown to the visitor

#### Scenario: Invalid email
- GIVEN a malformed email
- WHEN they POST `/api/waitlist`
- THEN the API returns HTTP 400

### Requirement: Landing legal pages
`/privacy`, `/terms`, and `/data-deletion` SHALL render the matching `@rotra/legal-content` components as static pages.

#### Scenario: Landing privacy page
- GIVEN a visitor
- WHEN they request `/privacy` on the landing app
- THEN `PrivacyPolicyContent` is shown

### Requirement: Footer social links are placeholders
Landing footer social, changelog, and support links SHALL use `#` anchors and MUST NOT navigate to implemented destinations.

#### Scenario: Footer placeholder link
- GIVEN the landing footer
- WHEN a social or support control is present
- THEN its href is `#`

## Source

- `apps/landing/src/app/page.tsx`
- `apps/landing/src/app/api/waitlist/route.ts`
- `apps/landing/src/app/privacy/page.tsx`
- `apps/landing/src/app/terms/page.tsx`
- `apps/landing/src/app/data-deletion/page.tsx`
- `apps/landing/src/lib/waitlist/validate-email.ts`
- `apps/landing/src/components/coming-soon/**`
- `packages/db/prisma/models_waitlist.prisma`
- `packages/legal-content/**`
