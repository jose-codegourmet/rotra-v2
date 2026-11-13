# Track specification: Pictures on Railway Buckets

**Track ID:** pictures-buckets_20261113 · **Type:** refactor · **Priority:** medium (order 11 of 12) · **Created:** 2026-11-13
**Depends on:** go-writes-admin-player · **Decisions:** B-06, B-13, D-2026-11-09-10 ([register](../../../docs/mvp/decisions.md#d-2026-11-13-01), [backend open decisions](../../../docs/backend/open-decisions.md))

## Why

Moves avatars, club logos, court pictures, banners and characters off Supabase Storage, keeping current + previous and serving by presigned URL so egress stays free.

## Requirements

### R1: Bucket and uploads

Bucket `pictures` in Singapore (region can't change later); upload, swap current/previous, cleanup in the same request.

**Accepted when:**

- [ ] Keep-two rule tests pass

### R2: Serving

Presigned URLs with a cache-friendly lifetime; the API never streams a picture.

**Accepted when:**

- [ ] No service egress for picture bytes

### R3: Copy

Copy existing files from Supabase Storage; references updated.

**Accepted when:**

- [ ] Every reference resolves after the copy

## Scope

**In:** Picture upload/serve paths.

**Out:** CDN (B-13); Image processing changes.

## Testing

Go: strict TDD, characterization tests first for ported routes, real Postgres in tests, ≥ 80% coverage ([workflow](../../workflow.md)).
