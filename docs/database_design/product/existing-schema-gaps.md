# Existing repository versus the proposed v1 design

**Status:** Read-only comparison with the local Prisma source inspected October 25, 2026. This does not verify a deployed database or migration state.

| Area | Inspected repository | Proposed v1 direction |
|---|---|---|
| Player identity | `Profile.id` tied to auth identity; legacy Facebook/admin/EXP/MMR fields together | Independent player UUID, optional claimed auth mapping, private contacts |
| Guest participation | SessionRegistration and MatchPlayer require Profile FKs | Club-local identity and roster ID support guests without accounts |
| Clubs | Owner profile and role-bearing ClubMember relationships | Dedicated club account; no manager membership/role system in v1 |
| Sessions | Nullable club, player host, player-organized origin | Required club, one active/reserved session |
| Participation | Waitlist/admission/player-status/payment fields | Operator-confirmed roster, presence switch, fixed session level |
| Costs | `QueueSession` has one `shuttleType`, `shuttleCostPerTube`, `shuttlesUsed`, and `courtCost` (decimals); `SessionRegistration.perPlayerCost` | Club `inventory_items`; optional per-session estimate with several shuttle lines in integer minor units; derived break-even only; no per-player cost or payment record |
| Formats/courts | Match has one required court number; session score limit/format | Waiting queue independent of courts, flexible team sizes, multiple court occupancy |
| Match identity | MatchPlayer unique match/profile, one row per person | Participation segments preserve substitutes and full-game eligibility |
| Outcomes | Mutable score/finalization/void columns and review references | Confirmed terminal decision immutable; no normal result correction |
| Rating | Separate peer-rating, EXP, MMR structures | Club assessment plus performance, with 70/30 configurable weights and rolling window |
| Licensing | No dedicated v1 club-license model established by these inspected files | Manual monthly/yearly terms, entitlement and expiry-cycle records |
| Offline | Inspected session/match schema has no per-device operation/seal model | Download snapshots, durable operations, conflict quarantine, finalization barrier |
| Public deletion | Existing session/profile relations include cascade deletion paths | Public publication deletion separate from retained history |

Sources:

- [Profile Prisma source](../../../packages/db/prisma/models_profile.prisma)
- [Club Prisma source](../../../packages/db/prisma/models_club.prisma)
- [Session Prisma source](../../../packages/db/prisma/models_session.prisma)
- [Match Prisma source](../../../packages/db/prisma/models_match.prisma)
- [Schema configuration](../../../packages/db/prisma/schema.prisma)

## Migration work is separate

Do not run a schema push, drop legacy tables, reinterpret old EXP/MMR as the new rating, or synthesize missing guest/contact history from this document.

A future migration proposal must inventory real data and applied migrations, decide whether this is a clean launch or data-preserving transition, map old identities, preserve history, plan account-provider changes, and define a reversible deployment sequence where feasible. Existing RLS/deployment state must be checked directly then; the design is not evidence that protection is already enabled.

User deletions of legacy documentation were left untouched while writing this new design. The new design references the new business docs and current code, rather than assuming removed historical docs still exist.
