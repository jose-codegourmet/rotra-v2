# Database services (`@rotra/db`)

**Last verified:** 2026-11-01. **Status:** Server-only service code over the drafted, **unapplied**
schema. Not run against a database; lint, type-check and build were not run for these modules.
Every proposal below that depends on an open decision (#243–#248) is marked as such in the code.

Route Handlers call these through `handleAccountRequest` / `handlePublicRead` (architecture §8).
Each command is repeat-safe on its command or operation ID, checks the expected revision where the
screen loaded one, and returns an allowlisted DTO.

## F07.21 · Clubs, venues, licenses, configuration

| Module | Commands |
|---|---|
| `admin/clubs` | `stageClub` → `provisionClubAccount` (staged: database first, provider second, resumable on the club ID); `setClubPricing`; `readClubsForAdmin`; club-side `readClubSettings`, `updateClubSettings`, `requestClubNameChange`; owner `reviewClubNameChange`; `readVenues`, `saveVenue` |
| `admin/licenses` | `activateLicense` (club lock → one term per command → cancel the running expiry cycle → refresh entitlement); `refreshEntitlement`; `refreshLapsedEntitlements` (starts a new expiry cycle); `readLicenseTerms`, `readOwnLicense` |
| `admin/configuration` | `createFeatureFlag`, `setFeatureFlag` (expected revision), `saveRankingPolicy` (appends the next version under the expected current version) |
| `admin/audit` | `recordAudit`: redacted before/after metadata, repeat-safe on the command |
| `auth/provider-admin` | `ProviderAdmin` port for external Auth calls; the adapter is chosen under #243/#244 |

- A new Free club stores no paid prices and gets no fake license history.
- A renewal starts when current access ends, or now when lapsed (stacking is a proposal, #245).
- Saving a ranking policy records configuration only; it never claims ranks were refreshed.

## F07.22 · Identity matching, RTR ID allocation, profile reads

| Module | Commands |
|---|---|
| `player/identity` | `resolveClubPlayerIdentity` (after the entry syncs: phone advisory lock → reuse the player and allocation, or create player + private contact + RTR ID in one transaction; unique races retry from resolution); `resolveSessionIdentities` |
| `player/profile` | public `readPublicProfile`, `findPublicProfileByRtrId` (allowlisted `PlayerProfile`, only for allocated IDs); own `readMyAccount`, `readMyProfile`, `updateMyProfile` (expected revision, no contact fields), `setPhonePrivacy`; club `readClubVisiblePhone` (phone only, and only when not hidden) |
| `player/claim` | `issueClaimLink` (club's linked unclaimed player; token digest only; reissue revokes), `readClaimLink` (masked phone), `completeClaim` (provider login keyed on the link ID, then one transaction: email, account mapping, claimed, link consumed) |

- A phone already linked to a different club player in the same club is marked `conflicted` for review, never merged.
- Unclaimed and claimed profiles differ: only a valid link plus the provider login claims; a name or RTR ID never does.
- Historical guest attribution projections are F07.30.
