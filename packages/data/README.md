# @rotra/data

In-memory mock data for Foundation and Queue, through match control. Import modules through the explicit package subpaths; there are no barrels.
`club` exports `useClub`; `club/types`, `club/query-keys`, and `club/fetchers` expose the other domain layers.
Each app owns its QueryClient. Fetchers are the replacement point for real transport later.

`mockStore.getSnapshot()` is immutable and referentially stable until `update` or `reset`.
`subscribe` returns an unsubscribe function. Only fetchers and development tools use the store directly.
Mutation hooks invalidate domain queries. Each app connects its QueryClient to store changes and its Redux
dev slice through `mock/bridge`. DevMenu resets fixtures and simulates offline, expired licenses, save
failures, and conflicts. Redux stores only auth, UI, and development state.
`setMockLatencyEnabled(false)` disables the default 400 ms delay for Storybook and returns a cleanup function.

## Fixture provenance

All values are fictional. `fixtures/clubs`, `fixtures/venues`, and `fixtures/players` are shared by apps
and stories. The private `players.seed.json` is a deterministic snapshot of the prototypes' generators,
not a new source of domain rules. No contacts or credentials are included in the public Player shape.

| Export | Count | Source |
| --- | ---: | --- |
| clubs | 8 | Admin `seedClubs`, including Tagbilaran's free tester pricing mode |
| venues | 3 | Queue `seedVenues` |
| clubPlayers | 23 | Saved club roster, all registered. Kenji, Kenjie and Atty Steph (Maria Steph) are last |
| adminPlayers | 53 | Every player in the seed |
| leaderboardPlayers | 53 | Ordered by level. Jose is #39 |
| directoryPlayers | 4 | Camill, Ley, Sam and Robert stay directory suggestions |
| players | 53 | Seed identities, including Kenji and Kenjie |

UUIDs are fixed fixture identifiers, separate from RTR IDs; they do not implement real ID allocation.
The Player prototype's ten `FIXED` people reuse the Queue/Admin identity and RTR ID, as does Migs.
The two Carlo Medina profiles remain separate. Queue playing levels use its existing `oldToNewLevel`
conversion; they are club assessments, not computed shared ranks. Session, license, and console fixtures extend this snapshot. Global ranking calculations and
history-only clubs (such as Mandaue Shuttle Society) remain for later product epics.

The independently generated prototypes assign `RTR-PH-CEB-050726-0224` to both Karl Espiritu (Admin)
and Mika Ong (Player). The shared mock snapshot keeps Karl's value and gives Mika the fixture-only
`RTR-PH-CEB-050726-9001` to avoid representing two people with one identity. Names and sample counts stay intact.
Club prices retain the saved paid prices even for a free club, matching the Admin prototype; no license
terms are inferred from those prices. The four Queue license terms are separate prototype fixtures. Venue/club money is stored as integer centavos, with missing entrance fees as null.

## Verification

`pnpm test` uses Vitest. The standings suite covers wins, losses, head-to-head, name ordering,
and invalid/substitution-partial exclusion. Broader behavior was checked with a temporary scratch harness:
11 passing scenarios covering settings, sessions, roster, queue, match control, auth, and offline sync.
The harness is not shipped as an additional test suite.

## Mock contracts

- Hooks live in individual domain files and use explicit package exports. Mutation results carry
  `message`, `savedOffline`, and their domain `data`; no mutation writes domain data into Redux.
- Session setup, club settings, saved venue edits, downloads, directory searches, and invites require
  online access. Session writes work offline only with a downloaded copy. Expired licenses block new
  sessions and club administration while allowing an already active session to finish.
- Writes clone the store, validate, check the simulated save result, and commit domain changes and
  sync history together. Reconnect reconciles pending changes after a short delay. Reset cancels stale
  download completion. The mock is in-memory; reloading clears domain changes and device downloads.
- Match confirmations require an `operationId`. Repeating the same operation returns its original
  result; reusing the ID for different input is a conflict. Completed and invalid decisions have no
  edit/delete mutation. Substitution partials earn no counted game or standing credit.
- Queue generation is the prototype reference heuristic, with injectable randomness in pure rules.
  The final strength model, mode weights, and default run size remain open decisions.
- Mock sign-in accepts any nonempty credentials and sets audience-specific cookies. These are mock
  markers, not real authorization. Sign-in forms/routes are separate screen tickets. Approved route
  boundaries are documented in `docs/screens/product/navigation.md`.
- DevMenu is available in development or when built with `NEXT_PUBLIC_ROTRA_DEV_MENU=1`. Production
  config replaces the development module with a null component so controls are absent from bundles.
- Saved-player and directory hooks never expose phone numbers. New guest phone values stay in the
  private mock store. Identity lookup/sync, real auth, storage, cross-device conflicts, financial
  calculations, session finalization, and awards are outside these tickets.
