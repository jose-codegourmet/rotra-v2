# Legal Specification

## Purpose

Public legal pages in `apps/client`: Terms of Service, Privacy Policy, and Data Deletion. They are read-only and share copy from `@rotra/legal-content`. Landing-app legal pages are specified in `landing`.

## Requirements

### Requirement: Public legal routes
`/terms`, `/privacy`, and `/data-deletion` SHALL be public middleware paths (no session required). Each page SHALL render outside `DashboardLayout` with a ROTRA logo and “Back to login” link to `/login`.

#### Scenario: Logged-out visitor reads terms
- GIVEN no Supabase session
- WHEN they request `/terms`
- THEN the page is served without a login redirect

#### Scenario: Back to login
- GIVEN any of the three legal pages
- WHEN the visitor uses “Back to login”
- THEN they navigate to `/login`

### Requirement: Shared legal content package
Each page SHALL render the matching `@rotra/legal-content` component (`TermsOfServiceContent`, `PrivacyPolicyContent`, `DataDeletionContent`). Pages MUST NOT post forms or call APIs. Shared content SHALL include an effective date of April 19, 2026 and a boilerplate disclaimer that the text is not legal advice.

#### Scenario: Privacy page body
- GIVEN a visitor on `/privacy`
- WHEN the page renders
- THEN `PrivacyPolicyContent` is shown
- AND no network mutation is issued

### Requirement: Login footer links
The login footer and login card copyright SHALL link to `/terms` and `/privacy`. They MUST NOT link to `/data-deletion`.

#### Scenario: Login footer
- GIVEN the `/login` page
- WHEN the footer renders
- THEN Terms and Privacy links are present
- AND Data Deletion is not linked from that footer

## Source

- `apps/client/src/app/terms/page.tsx`
- `apps/client/src/app/privacy/page.tsx`
- `apps/client/src/app/data-deletion/page.tsx`
- `apps/client/src/middleware.ts`
- `packages/legal-content/src/TermsOfServiceContent.tsx`
- `packages/legal-content/src/PrivacyPolicyContent.tsx`
- `packages/legal-content/src/DataDeletionContent.tsx`
- `apps/client/src/components/modules/auth/auth-page/login-card/**`
