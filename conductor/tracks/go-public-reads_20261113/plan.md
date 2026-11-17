# Plan: Public reads in Go

**Track ID:** go-public-reads_20261113 · **Spec:** [spec.md](./spec.md)

Ticket: #874 (one issue for the whole track, under epic #869).

## Phase 1: Player public

- [ ] **1.1** Characterize + port leaderboard and search
- [ ] **1.2** Public player pages and RTR IDs
- [ ] **1.3** Club page, banners, characters, ranking settings

## Phase 2: Public session

- [ ] **2.1** Characterize public session reads
- [ ] **2.2** Snapshot cache (tests: TTL, two versions, concurrent refresh = one read)
- [ ] **2.3** Port the routes

## Phase 3: Switch

- [ ] **3.1** The pages that read these services directly (club page and members, register, Queue public session page and its preview) read through Go instead (B-51); add this track's `/api/*` prefixes to the `ROTRA_GO_MOVED_AREAS` list (local now; the beta project gets the full list in staging-verification; remove a prefix to undo, the Route Handler stays until ship); manual check locally; record what was verified

## Deviations log

| Date | Task | Deviation | Reason | Resolution |
|---|---|---|---|---|
