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
