# Track specification: Admin and Player writes in Go

**Track ID:** go-writes-admin-player_20261113 · **Type:** refactor · **Priority:** high (order 8 of 12) · **Created:** 2026-11-13
**Depends on:** go-signed-in-reads · **Decisions:** B-01, B-02 ([register](../../../docs/mvp/decisions.md#d-2026-11-13-01), [backend open decisions](../../../docs/backend/open-decisions.md))

## Why

Admin and Player writes are simpler than Queue's offline writes, so they move first.

## Requirements

### R1: Admin writes

Clubs, licenses, player edit (incl. beta-only password field, D-2026-11-09-14), contact-change decisions, password-reset issuance, banners, characters, feature flags, ranking settings.

**Accepted when:**

- [ ] Same audit events as today
- [ ] Revision conflicts behave the same

### R2: Player writes

Registration, profile and visibility, contact-change requests, club join/leave, banner choice.

**Accepted when:**

- [ ] Characterization tests pass

### R3: Rules

Any rule a write enforces runs in Go only after it passes its `@rotra/rule-cases` cases.

**Accepted when:**

- [ ] Case runs recorded per rule

## Scope

**In:** Admin and Player POST/PATCH/DELETE routes.

**Out:** Pictures (own track); Queue writes.

## Testing

Go: strict TDD, characterization tests first for ported routes, real Postgres in tests, ≥ 80% coverage ([workflow](../../workflow.md)).
