# @rotra/data

In-memory Foundation data only. Import modules through the explicit package subpaths; there are no barrels.
`club` exports `useClub`; `club/types`, `club/query-keys`, and `club/fetchers` expose the other domain layers.
Each app owns its QueryClient. Fetchers are the replacement point for real transport later.

`mockStore.getSnapshot()` is immutable and referentially stable until `update` or `reset`.
`subscribe` returns an unsubscribe function. Only fetchers and development tools use the store directly.
Future mutation hooks must invalidate affected query keys. A future Reset demo data control must call
`reset()` and invalidate the QueryClient. Reset UI and failure/offline toggles are not built here.
`setMockLatencyEnabled(false)` disables the default 400 ms delay for Storybook and returns a cleanup function.

## Fixture provenance

All values are fictional. `fixtures/clubs`, `fixtures/venues`, and `fixtures/players` are shared by apps
and stories. The private `players.seed.json` is a deterministic snapshot of the prototypes' generators,
not a new source of domain rules. No contacts or credentials are included in the public Player shape.

| Export | Count | Source |
| --- | ---: | --- |
| clubs | 8 | Admin `seedClubs`, including Tagbilaran's free tester pricing mode |
| venues | 3 | Queue `seedVenues` |
| clubPlayers | 20 | Queue `seedPlayers`; 16 linked profiles, 4 guests |
| adminPlayers | 185 | Admin `seedPlayers`: 17 fixed + 168 generated |
| leaderboardPlayers | 1,284 | Player `BASE`: 1,283 + Migs at #128 |
| directoryPlayers | 4 | Queue `DIRECTORY` |
| players | 1,462 | Union of shared global identities, without guests |

UUIDs are fixed fixture identifiers, separate from RTR IDs; they do not implement real ID allocation.
The Player prototype's ten `FIXED` people reuse the Queue/Admin identity and RTR ID, as does Migs.
The two Carlo Medina profiles remain separate. Queue playing levels use its existing `oldToNewLevel`
conversion; they are club assessments, not computed shared ranks. Sessions, results, ranking calculations,
and history-only clubs (such as Mandaue Shuttle Society) remain for their product epics.

The independently generated prototypes assign `RTR-PH-CEB-050726-0224` to both Karl Espiritu (Admin)
and Mika Ong (Player). The shared mock snapshot keeps Karl's value and gives Mika the fixture-only
`RTR-PH-CEB-050726-9001` to avoid representing two people with one identity. Names and sample counts stay intact.
Club prices retain the saved paid prices even for a free club, matching the Admin prototype; no license
terms are created. Venue/club money is stored as integer centavos, with missing entrance fees as null.

## Verification

`pnpm test` uses Vitest. This package intentionally has no tests yet: only money, phone parsing,
ranking/standings/awards math and queue-rule tests are authorized. Core behavior is checked manually.
