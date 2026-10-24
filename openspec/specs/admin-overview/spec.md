# Admin Overview Specification

## Purpose

Documented Admin App purpose, access model, what admins can and cannot do, audit logging, and platform analytics. Current page-level behavior is in `admin-auth`, `admin-approvals`, `admin-users`, `admin-places`, `admin-platform`, and `admin-notifications`.

## Status

**Documented product rules** from `docs/business_logic/admin_app/01_admin_overview.md` and `06_platform_analytics.md`. Current `admin-platform` dashboard/analytics pages are mock. Do not claim analytics APIs exist.

## Actors

Founding Super Admin, Super Admin, Admin, internal operators.

## Requirements

### Requirement: Separate internal app
The Admin App SHALL be an internal-only dashboard, hosted on a separate URL from the Client App. There SHALL be no public registration. Admins SHALL NOT appear in player-facing views, leaderboards, or club rosters. Admins SHALL NOT manage live sessions or override match scores (Que Master domain).

#### Scenario: No session override
- GIVEN an admin watching a live session
- WHEN they attempt to change a match score from the Admin App
- THEN that action is out of Admin scope

### Requirement: Access levels
Founding Super Admin (`FOUNDING_SUPER_ADMIN_ID`) SHALL be seeded and cannot be deactivated, demoted, or removed by UI. Super Admins MAY manage other admins. Regular Admins SHALL have platform tools but read-only access to the Admins module. Every mutating admin action SHALL write append-only `admin_action_log` (timestamp, actor, action, entity, before/after, optional note).

#### Scenario: Founding admin protected
- GIVEN the founding Super Admin id
- WHEN another Super Admin tries to deactivate them
- THEN the mutation is refused

### Requirement: Admin auth extras
Documented Admin App login SHALL be email + password after invite. Sessions SHALL expire after 4 hours of inactivity. Traffic MAY be IP-restricted. Failed logins SHALL be rate-limited and logged. OTP/TOTP is optional future work. Current `admin-auth` specifies the implemented password/invite/OTP-page behavior.

#### Scenario: Inactivity timeout (documented)
- GIVEN an admin idle for more than 4 hours
- WHEN they make an authenticated request
- THEN the documented rule requires re-authentication

### Requirement: Analytics is read-only
Platform analytics SHALL be read-only. Default time range SHALL be last 30 days. Environment filter SHALL default to prod. Region filter is future. Export SHALL support CSV and PDF snapshot. Metrics groups SHALL include platform health, growth, engagement (including the vision targets ≥4 sessions/club/month, ≥80% registration, ≥60% review completion, <5 min setup, <10 min waitlist response), feature adoption, financial signals (not accounting), and moderation health.

#### Scenario: Cannot edit from analytics
- GIVEN an admin on analytics
- WHEN they want to change a kill switch
- THEN they must leave analytics and use the kill-switch module

## Source

- `docs/business_logic/admin_app/01_admin_overview.md`
- `docs/business_logic/admin_app/06_platform_analytics.md`
- `docs/business_logic/admin_app/README.md`
