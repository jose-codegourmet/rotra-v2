# Player ranking and prototype corrections

## Implemented

- [x] #151: mock leaderboard, rank, game history, query keys and hooks.
- [x] #152: Player shell and navigation.
- [x] #153: leaderboard and exact RTR ID lookup.
- [x] #154: rank detail screen.
- [x] #155: game history screen.
- [x] #156: leaderboard loading, empty, error, offline and refetch states.
- [x] #157: rank detail and game history states.
- [x] Restore reference podium, portraits and player click destinations.
- [x] Add public profile destinations and align rank/eligibility presentation.
- [x] Match Prototype sheet, own-position card and highlighted leaderboard row.
- [x] Implement prototype mock sign-in and password recovery routes.
- [x] Record implemented behavior and explicitly retain unfinished account/claim scope.

## Verification

- [x] Earlier runtime walkthrough: leaderboard/player navigation, rank/history,
  Show my row, copy ID, prototype controls, sign-in and generic recovery flow.
- [x] Earlier focused mock checks: fixture totals, paging, search, exact lookup,
  eligibility, public projection privacy, sign-in and reset-link consumption.
- [x] Workspace lint passes: `pnpm lint` (6 tasks, 2026-10-28).
  Biome reports an informational size limit for the 1.5 MiB portrait asset.
- [x] Workspace production build passes: `pnpm build` (Player, Queue and Admin, 2026-10-28).
- [x] Workspace type-check passes: `pnpm type-check` (6 tasks, 2026-10-28).
- [ ] Full Storybook matrix at 375/1280 in both themes (not run).
- [ ] Merge into the confirmed working branch after checks pass.

The focused mock checks were temporary local scripts, not committed regression
suites. Runtime checks do not constitute an exhaustive visual/accessibility audit.
