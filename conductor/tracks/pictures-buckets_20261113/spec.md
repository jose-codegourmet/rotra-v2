# Track specification: Pictures on Cloudflare R2 (Railway Buckets as the fallback)

**Track ID:** pictures-buckets_20261113 · **Type:** refactor · **Priority:** medium (order 11 of 12) · **Created:** 2026-11-13 · **Refined:** 2026-11-14 (B-31)
**Depends on:** go-writes-admin-player · **Decisions:** B-06, B-13, B-31, D-2026-11-09-10 ([register](../../../docs/mvp/decisions.md#d-2026-11-13-01), [backend open decisions](../../../docs/backend/open-decisions.md))

## Why

Moves avatars, club logos, court pictures, banners and characters off Supabase Storage, keeping current + previous, with addresses that keep working for old results, link previews, share images and browser caching ([B-31](../../../docs/backend/open-decisions.md#settled)).

## Requirements

### R0: Pick the store (B-31)

**Plan A, Cloudflare R2:** a public bucket on a ROTRA picture subdomain (e.g. `img.rotra.club`, name confirmed here). Needs `rotra.club` as a Cloudflare zone: move the nameservers to Cloudflare's free plan with every Vercel record kept **DNS only**, or a partial (CNAME) setup if confirmed available on the free plan. `r2.dev` stays off. **Stop and ask** before moving nameservers.

**Plan B, Railway Buckets:** if plan A doesn't work out. Private bucket `pictures` in Singapore (region can't change later).

**Accepted when:**

- [ ] Plan chosen and recorded in backend open decisions, with the reason if plan B
- [ ] Plan A: the Vercel apps (current and beta) still resolve and serve on their domains after the DNS change
- [ ] Plan A: a test picture loads from the picture subdomain, cached by Cloudflare, with CORS allowing the apps' origins

### R1: Uploads

The Go API uploads; upload, swap current/previous and cleanup in the same request; 512 px resize unchanged (D-2026-11-09-10).

**Accepted when:**

- [ ] Keep-two rule tests pass

### R2: Serving

- **Plan A:** the database stores the permanent public address on the picture subdomain, as today.
- **Plan B:** the database stores bucket keys; pages use a stable ROTRA picture address that redirects to a presigned URL signed per day with a 7-day expiry, cached; share images load through the API with bytes passed through if bucket CORS can't be set.

**Accepted when:**

- [ ] No service egress for picture bytes (plan B: except share-image loading if CORS fails)
- [ ] A share image with a club logo and player photos draws on a canvas
- [ ] An old result's logo and a session page's link preview still load a week later

### R3: Copy

Copy existing files from Supabase Storage; every stored address rewritten (plan A: new prefix; plan B: keys), result snapshots included. Data migration: owner sign-off.

**Accepted when:**

- [ ] Every reference resolves after the copy

## Scope

**In:** Picture upload/serve paths, the store setup, the copy.

**Out:** Image processing changes. A CDN for anything other than pictures (B-13).

## Testing

Go: strict TDD, characterization tests first for ported routes, real Postgres in tests, ≥ 80% coverage ([workflow](../../workflow.md)).
