# Track specification: Staging verification: live checks and load test

**Track ID:** staging-verification_20261117 · **Type:** chore · **Priority:** high (order 12 of 13) · **Created:** 2026-11-17
**Depends on:** every move track (go-public-reads, go-sign-in, go-signed-in-reads, go-writes-admin-player, go-writes-queue, live-updates, pictures-buckets) · **Decisions:** B-24, B-30, B-41–B-44, B-52 ([backend open decisions](../../../docs/backend/open-decisions.md))

## Why

During the move every track is checked locally: apps → local Go API → local Postgres ([B-52](../../../docs/backend/open-decisions.md#settled)). Nothing local can show how Railway, Vercel, the real domains and real load behave. This track runs those checks once, after every area is in Go, so each check tests the finished system instead of a half-moved one. What it finds is logged as bugs, not fixed inside this track.

## Requirements

### R1: Beta project and data (from beta-stack R1, R3)

A second Vercel project built from the long-lived `go-stack` branch (created off `main`, backlog [BL-5](../../tracks.md#backlog), B-20), real data mode, domains `queue-beta`, `player-beta`, `admin-beta`.rotra.club, cross-app URLs on the beta domains, and the full `ROTRA_GO_MOVED_AREAS` list (or `/api`). Railway Postgres in staging starts from a copy of the Supabase database. The beta never signs anyone in through Supabase Auth (B-24): no Supabase keys in the beta project; real users don't get the beta domains.

**Accepted when:**

- [ ] The beta project builds `go-stack` and the current project still builds `main`; the three beta apps load in real mode
- [ ] Copy rehearsed and documented; row counts compared; the account import (go-sign-in R5) rehearsed on the copy with a report
- [ ] The beta Vercel project has no Supabase variables in any environment (checked in the Vercel dashboard, recorded in the plan); a Supabase-backed action on beta fails and changes nothing in Supabase
- [ ] Railway default domain test (B-30, from go-api-foundation R6): the beta apps reach Go on `api-beta.rotra.club`; then `*.up.railway.app` is removed and the check repeated; result recorded in backend open decisions

### R2: Vercel-only behavior

What the local check could not cover.

**Accepted when:**

- [ ] Go sees the client IP Vercel sets; a client-sent `X-Forwarded-For` through the beta apps is overwritten, and a direct call to Go with a faked one and no secret is not trusted (B-30)
- [ ] Each audience signs in on beta; sign-in cookies work across the beta subdomains
- [ ] A forwarded call with Go stopped shows the existing offline / network error within 10 seconds (B-46)
- [ ] Latency from Vercel `sin1` to Railway Singapore recorded

### R3: Live streams (from beta-stack R4, live-updates)

**Accepted when:**

- [ ] A beta app keeps a stream open on `api-beta.rotra.club` for an hour; no stream request in Vercel's function logs (B-41)
- [ ] An event reaches a connected screen in under a second on staging
- [ ] During a deploy, `/readyz` fails first and reconnects spread over about 5 seconds; phones catch up with no manual refresh (B-44)

### R4: Monitoring live (from monitoring R1–R3)

**Accepted when:**

- [ ] Postgres metrics (Alloy) and API metrics visible on Grafana Cloud for staging; deploy-timing panel shows data
- [ ] Each alert in [observability](../../../docs/observability.md#planned-go-api-postgres-and-pictures-on-railway) fires once on staging and resolves

### R5: Load test (B-42, from ship-and-retire R1)

**Accepted when:**

- [ ] Load test (Go, `apps/api/cmd/loadtest`): one hour on staging, 50 clubs × 3–5 screens, about 20 viewers per public session page, writes every few seconds, a deploy in the middle; p95 under 1 s, errors under 2%, memory well below the instance limit; B-43 limits refuse what they should and nothing else; results recorded in the plan

## Findings

Every problem found is a GitHub issue labeled `bug`, a sub-issue of the Go API epic (#869), linked in the plan's findings table. The fix lands through the usual ticket flow, not inside this track. The owner marks each bug **blocker** (must be fixed before ship) or not.

## Scope

**In:** The above.

**Out:** Fixing bugs (their own tickets); shipping (ship-and-retire).

## Testing

No new code except `apps/api/cmd/loadtest` (Go, TDD for its pieces). The rest is checks against live environments, recorded in the plan.
