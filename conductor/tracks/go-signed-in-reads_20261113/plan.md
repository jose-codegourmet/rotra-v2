# Plan: Signed-in reads in Go

**Track ID:** go-signed-in-reads_20261113 · **Spec:** [spec.md](./spec.md)

Ticket: #876 (one issue for the whole track, under epic #869).

## Phase 1: Player

- [ ] **1.1** Characterize + port me/account/clubs/sessions
- [ ] **1.2** Compare, #569 access and the signed-in match history read (#850)

## Phase 2: Admin

- [ ] **2.1** Characterize + port Admin lists and views

## Phase 3: Queue

- [ ] **3.1** Characterize + port club and session reads
- [ ] **3.2** Sync read

## Phase 4: Switch

- [ ] **4.1** Add this track's `/api/*` prefixes to the `ROTRA_GO_MOVED_AREAS` list (local now; the beta project gets the full list in staging-verification; remove a prefix to undo); manual check per app, locally

## Deviations log

| Date | Task | Deviation | Reason | Resolution |
|---|---|---|---|---|
