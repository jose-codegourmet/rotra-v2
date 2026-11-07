# ROTRA MVP roadmap

**Decision tracking:** [MVP decisions](MVP-DECISIONS.md) records approval, ticket, implementation and roadmap status for new decisions.

**Purpose:** Quick orientation for contributors and AI agents. GitHub issues are the implementation tracker; this file summarizes scope, not a replacement for tickets. Check `main` and linked issues before assuming a feature is missing. Updated 2026-11-07.

## MVP goal
A club operator can sign in, prepare a badminton session, manage players and courts, queue and score matches, finish the session, and retain results. Player Information exposes identities/history; Admin manages clubs and access.

## Current implementation
- **Queue:** Real-mode APIs and database services exist for sessions, roster, courts, waitlist, join requests, payments, match queue/control, results and finalization. See `apps/queue/src/app/api`, `packages/data/src/real/{queue,session-live,match,financials,finalization}.ts`.
- **Player:** Public profiles, games, leaderboard reads and own-profile APIs have real adapters. See `packages/data/src/real/{player,leaderboard}.ts`.
- **Admin:** Real adapters cover clubs/licenses, player directory/history, configuration, audit and contact-request review/decline. See `packages/data/src/real/{admin,admin-players,configuration,contact-change}.ts`.
- **Infrastructure:** Next.js apps, shared packages, Prisma/Supabase services and manual GitHub Actions deployment. See `docs/architecture.md` and `README.md`.

## Remaining work / decisions
1. **Player access:** Complete real sign-in, account registration/claim and recovery entry points. MVP recovery decision (2026-11-07): **no automated email**; player contacts ROTRA support via Messenger/Instagram, platform Admin verifies identity and generates a short-lived single-use reset link from the player profile, then shares it manually. No player-submitted recovery requests or notification inbox for MVP. Implementation not yet confirmed; track with a ticket before building.
2. **Offline Queue:** Durable device copy, outbox/replay, device downloads and interruption recovery are not connected; online writes are already database-backed. See `packages/data/src/real/sync.ts`, [#246](https://github.com/jose-codegourmet/rotra-v2/issues/246), and Queue offline docs.
3. **Ranking:** Finalize the ranking/fairness/award rules and connect recalculation; saved ranking settings alone do not calculate ranks. See [#247](https://github.com/jose-codegourmet/rotra-v2/issues/247).
4. **Admin contact changes:** Request reads and decline are connected; approval, provider application retry and status check remain incomplete. See `packages/data/src/real/contact-change.ts` and [#241](https://github.com/jose-codegourmet/rotra-v2/issues/241).
5. **Obvious Queue bugs ([#466](https://github.com/jose-codegourmet/rotra-v2/issues/466), 2026-11-07):** Implemented: debounced inventory stock, prompt confirm/remove player, Facebook post from the saved template (real mode), preparation tabs in the URL, invite link + session QR, skill mix bar (roster and public, aggregate only), masked public names, operator-only preview, guest/ROTRA Player choice on Request to join, guest Invite to ROTRA, payment amounts with Partial/Reimburse. Still open: Downloads / This device ([#477](https://github.com/jose-codegourmet/rotra-v2/issues/477), blocked on #246); attaching a signed-in player to a join request and player sign-up (invite links point to player login until then); whether published results and profile pictures on the public page should also be masked.
6. **Latest Queue changes:** Reconcile and finish the November 6 prototype-to-app work (on-court handling, swapping, substitution credit, time and roster UI). Track each ticket under [#408](https://github.com/jose-codegourmet/rotra-v2/issues/408); do not assume all are missing—several routes already exist.
7. **Backend decisions:** Close remaining open design decisions where they block implementation. See `docs/database_design/product/open-decisions.md` and [#241](https://github.com/jose-codegourmet/rotra-v2/issues/241).

## Agent rules
- Before creating a ticket, compare the current app route, `packages/data/src/real` adapter and `packages/db/src` service; documentation can lag code.
- Classify work as **implemented**, **partially connected**, **not implemented**, or **deferred**. Do not label an unverified flow a bug.
- Follow `AGENTS.md`, `docs/ways-of-working.md`, and product rules in `docs/business_logic/product/`. Keep implementation detail in issues/PRs; update this summary when scope or status changes.
