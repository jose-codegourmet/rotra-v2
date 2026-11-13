# Backend

**Last verified:** 2026-11-13 · **Audience:** contributors, AI agents and the product owner.

This folder holds **backend decisions in progress**: proposals about how the server side is built,
hosted and run, and the backend questions that are still open. Product behavior stays in
[business logic](../business_logic/product/README.md), tables stay in
[database design](../database_design/product/README.md), and the decision register stays in
[mvp/decisions.md](../mvp/decisions.md). This folder doesn't replace any of them.

## Which source wins

Same rules as [ways-of-working §2](../ways-of-working.md#2-which-source-wins):

| Question | Wins |
|---|---|
| How the backend is built and hosted **today** | [architecture.md](../architecture.md) and the code on `main` |
| What a backend proposal asks for | The proposal in `decisions/` |
| Whether a proposal is approved | Its D-id entry in [mvp/decisions.md](../mvp/decisions.md) |
| What is still undecided | [open-decisions.md](open-decisions.md). **Ask.** Never fill a gap yourself |

A proposal changes nothing on its own. When the owner approves part of one, the same PR updates
[architecture.md](../architecture.md), [coding-conventions.md](../coding-conventions.md),
the D-id entry, and this folder's open decisions (move the item to **Settled**).

## Structure

```text
docs/backend/
  README.md            this page
  open-decisions.md    backend questions waiting for the owner (B-ids), plus the settled ones
  infrastructure.md    Railway setup as Infrastructure as Code, side-by-side rollout
  decisions/<date>-<topic>/01-proposal.md   one folder per proposal, same shape as docs/decisions/
```

## Current proposals

| Proposal | D-id | Status |
|---|---|---|
| [Go API on Railway](decisions/2026-11-13-go-railway-backend/01-proposal.md) | [D-2026-11-13-01](../mvp/decisions.md#d-2026-11-13-01) | decided 2026-11-13 (B-01 to B-19) |

## Other backend pages

- [Infrastructure](infrastructure.md): Railway Infrastructure as Code (`.railway/railway.ts`), services, regions, side-by-side rollout
- [Sign-in tables](../database_design/product/sign-in.md) (in database design)
- [Monitoring](../observability.md#planned-go-api-postgres-and-pictures-on-railway) (in observability)

## Related

- [Backend workstream](../mvp/workstreams/backend.md) for status and tickets
- [Database open decisions](../database_design/product/open-decisions.md) for anything that touches tables
- [Offline module](../business_logic/product/queue/modules/offline/README.md) for the Queue offline rules every backend must keep
