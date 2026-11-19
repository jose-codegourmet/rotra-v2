# Track specification: Sign-in owned by Go

**Track ID:** go-sign-in_20261113 · **Type:** feature · **Priority:** critical (order 6 of 14) · **Created:** 2026-11-13
**Depends on:** beta-stack · **Decisions:** B-04, B-11, D-2026-11-07-01, D-2026-11-09-14 ([register](../../../docs/mvp/decisions.md#d-2026-11-13-01), [backend open decisions](../../../docs/backend/open-decisions.md))

## Why

Every signed-in area needs it. It replaces Supabase Auth with the tables in the sign-in design and adds the device list, rate limits and offline device enrollment.

## Requirements

### R1: Tables

`auth_identities`, `auth_sessions`, `auth_rate_limits`, `auth_events` per [sign-in design](../../../docs/database_design/product/sign-in.md), as a Prisma migration on staging first. Per [B-36](../../../docs/backend/open-decisions.md#settled): migration PR on `main` → Railway staging → Supabase production → the Go PR; additive only.

**Accepted when:**

- [ ] Migration reviewed and signed off before the shared database
- [ ] Housekeeping ([B-34](../../../docs/backend/open-decisions.md#settled)): `auth_events` older than 90 days and ended sessions 90 days after they end are deleted (log first); a routine refresh writes no `auth_events` row, a reused refresh does

### R2: Sign-in, refresh, sign-out

Club username, player email, Admin; argon2id; bcrypt import rehash; host-only cookie per app; generic credential error. Passes per [B-27](../../../docs/backend/open-decisions.md#settled) ([sign-in › passes and lifetimes](../../../docs/database_design/product/sign-in.md#passes-and-lifetimes-b-27)): access passes signed with a private key held only in Railway, public key set published with key ids; 15-minute access, refresh 30 days extended on use (club, player) or 12 hours not extended (Admin); every write checks the session isn't revoked.

**Accepted when:**

- [ ] Key rotation ([B-47](../../../docs/backend/open-decisions.md#settled)): passes carry a key id; with two keys published, passes from both are accepted; after the old key is removed, an old access pass refreshes silently and nobody is signed out
- [ ] "Revoke all sessions" signs every device out on its next refresh
- [ ] Each audience signs in locally (on beta: staging-verification R2)
- [ ] Refresh rotation and reuse detection tested
- [ ] Grace window ([B-29](../../../docs/backend/open-decisions.md#settled)): the previous refresh pass within 30 s gets an access pass only and the session stays; after 30 s it revokes the session; two tabs and a page load refreshing together never sign the device out
- [ ] Within a tab, concurrent refreshes share one request
- [ ] A revoked session can't write at once, and can't read after its access pass expires

### R3: Device list and enrollment

Signed-in device list with sign-out (owner and Admin); Queue sign-in enrolls the device in `devices`. Per [B-28](../../../docs/backend/open-decisions.md#settled): replay from a revoked device is refused; the revoke dialog warns when the device holds an offline copy of a Queue Session (mockup first, backlog BL-7).

**Accepted when:**

- [ ] Revoking a device revokes its sessions
- [ ] Replayed commands from a revoked device are refused, and nothing from it is applied
- [ ] The revoke dialog names the Queue Sessions the device holds offline

### R4: Rate limits

Per account, IP and device on sign-in, reset request, claim and refresh. Starting values per [B-30](../../../docs/backend/open-decisions.md#settled) (configuration): wrong passwords per account 5 per 15 min; attempts per device 10 per 15 min; attempts per IP 100 per 15 min; claims and reset requests per IP 30 per hour. The IP is the forwarded client IP only when the proxy secret is present.

**Accepted when:**

- [ ] Limits enforced; counters expire without a job
- [ ] A faked `X-Forwarded-For` without the proxy secret doesn't change which IP is counted
- [ ] 30 sign-ins from one IP in 15 minutes (a full venue) are not limited

### R5: Claim and recovery

Player claim links and Admin-reviewed recovery issued by Go.

**Accepted when:**

- [ ] Existing claim and recovery scenarios pass

### R6: Account import

Idempotent import of Supabase accounts (same account rows, new identity ids, bcrypt hashes).

**Accepted when:**

- [ ] Tested locally on made-up accounts (bcrypt hashes, rerun changes nothing); the rehearsal on a copy of real accounts is staging-verification R1

### R7: Session check in the apps

Each app's `proxy.ts` session check verifies the Go access pass locally with Go's cached public key (no round trip, B-27) when `ROTRA_GO_API_URL` is set, and refreshes it when expired.

**Accepted when:**

- [ ] Current project unchanged

## Moved to go-sign-in-catch-up

Sign-in work that landed on `main` after this track was built is not part of this track: Google sign-in for players ([D-2026-11-16-01](../../../docs/mvp/decisions.md#d-2026-11-16-01)) and the check of a guest's invite link ([D-2026-11-18-07](../../../docs/mvp/decisions.md#d-2026-11-18-07)) are in [go-sign-in-catch-up](../go-sign-in-catch-up_20261119/spec.md). What is left here is task 5.2 only.

## Scope

**In:** The above.

**Out:** Social login (not v1); Email verification on claim (decided: none).

## Testing

Go: strict TDD, characterization tests first for ported routes, real Postgres in tests, ≥ 80% coverage ([workflow](../../workflow.md)).
