# Track specification: Sign-in owned by Go

**Track ID:** go-sign-in_20261113 · **Type:** feature · **Priority:** critical (order 6 of 12) · **Created:** 2026-11-13
**Depends on:** beta-stack · **Decisions:** B-04, B-11, D-2026-11-07-01, D-2026-11-09-14 ([register](../../../docs/mvp/decisions.md#d-2026-11-13-01), [backend open decisions](../../../docs/backend/open-decisions.md))

## Why

Every signed-in area needs it. It replaces Supabase Auth with the tables in the sign-in design and adds the device list, rate limits and offline device enrollment.

## Requirements

### R1: Tables

`auth_identities`, `auth_sessions`, `auth_rate_limits`, `auth_events` per [sign-in design](../../../docs/database_design/product/sign-in.md), as a Prisma migration on staging first.

**Accepted when:**

- [ ] Migration reviewed and signed off before the shared database

### R2: Sign-in, refresh, sign-out

Club username, player email, Admin; argon2id; bcrypt import rehash; host-only cookie per app; generic credential error.

**Accepted when:**

- [ ] Each audience signs in on beta
- [ ] Refresh rotation and reuse detection tested

### R3: Device list and enrollment

Signed-in device list with sign-out (owner and Admin); Queue sign-in enrolls the device in `devices`.

**Accepted when:**

- [ ] Revoking a device revokes its sessions

### R4: Rate limits

Per account, IP and device on sign-in, reset request, claim and refresh.

**Accepted when:**

- [ ] Limits enforced; counters expire without a job

### R5: Claim and recovery

Player claim links and Admin-reviewed recovery issued by Go.

**Accepted when:**

- [ ] Existing claim and recovery scenarios pass

### R6: Account import

Idempotent import of Supabase accounts (same account rows, new identity ids, bcrypt hashes).

**Accepted when:**

- [ ] Rehearsed on staging with a report

### R7: Session check in the apps

Each app's `proxy.ts` session check verifies the Go session when `ROTRA_GO_API_URL` is set.

**Accepted when:**

- [ ] Current project unchanged

## Scope

**In:** The above.

**Out:** Social login (not v1); Email verification on claim (decided: none).

## Testing

Go: strict TDD, characterization tests first for ported routes, real Postgres in tests, ≥ 80% coverage ([workflow](../../workflow.md)).
