# Plan: Google sign-in and the guest claim in Go

**Track ID:** go-sign-in-catch-up_20261119 · **Spec:** [spec.md](./spec.md)

Ticket: none yet (one issue for the whole track, under epic #869).

## Phase 1: Decide

- [ ] **1.1** Ask the owner: the open points in D-2026-11-16-01 (deadline date, password after the deadline), and whether the Go stack ships without Google sign-in while the flag is off (stop and ask)
- [ ] **1.2** Size R1 from the answers and rewrite phase 2

## Phase 2: Google sign-in (only if 1.1 says build)

- [ ] **2.1** Characterize the Google routes and the session and deadline rules on `main`
- [ ] **2.2** Port the routes and claim with Google
- [ ] **2.3** Add the Google session and deadline rules to the Go pass check in the apps
- [ ] **2.4** Add this track's `/api/*` prefixes to the `ROTRA_GO_MOVED_AREAS` list (local now; the beta project gets the full list in staging-verification)

## Phase 3: Guest invite link

- [ ] **3.1** Characterization test: redeem a name-only guest's link in Go and compare with TypeScript

## Deviations log

| Date | Task | Deviation | Reason | Resolution |
|---|---|---|---|---|
