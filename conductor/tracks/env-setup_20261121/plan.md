# Plan: Environment variables, what is missing and how to set it

**Track ID:** env-setup_20261121 · **Spec:** [spec.md](./spec.md)

Ticket: #997 (one issue for the whole track, under epic #869).

## Phase 1: Audit (read only)

- [x] **1.1** List the variables the Go config, the apps and the workflows read, and the Railway variable names on the Go service (2026-11-21; results in the spec and the guide)
- [ ] **1.2** Owner reads back the beta Vercel project's variable names and the GitHub Actions secret and variable names (no tool here has access), and says which Railway environment is the staging one
- [ ] **1.3** Fill the guide's table: one row per variable with its status

## Phase 2: Guide and example file

- [x] **2.1** Write `docs/backend/environment-setup.md` (first draft with the missing variables and the commands; 1.3 completes the status column)
- [x] **2.2** Add `apps/api/.env.example` with every variable the Go config reads (placeholders only; link from `apps/api/README.md`) (2026-11-23, added in go-sign-in-catch-up with the Google block; README linked)
- [ ] **2.3** Link the guide from `docs/backend/README.md` and `docs/backend/infrastructure.md`

## Phase 3: Set and verify (owner acts; stop and ask)

- [ ] **3.1** Owner generates and sets, on the Go service: `ROTRA_AUTH_SIGNING_KEY`, `ROTRA_VISITOR_RECEIPT_SECRET`, `ROTRA_QUEUE_ORIGINS`, `RAILWAY_DEPLOYMENT_DRAINING_SECONDS`; Claude confirms the names appear
- [ ] **3.2** Owner sets the matching values on the beta Vercel project (`ROTRA_PROXY_SECRET`, `ROTRA_VISITOR_RECEIPT_SECRET`, `ROTRA_GO_API_URL`, `ROTRA_GO_MOVED_AREAS`, the three `NEXT_PUBLIC_ROTRA_*_URL`), only when staging-verification 1.1 runs
- [ ] **3.3** Local check: Go API with the new variables, a sign-in and a visitor join request both answer as the guide says; rotate the Railway beta DB password (owner) or log it skipped

## Deviations log

| Date | Task | Deviation | Reason | Resolution |
|---|---|---|---|---|
