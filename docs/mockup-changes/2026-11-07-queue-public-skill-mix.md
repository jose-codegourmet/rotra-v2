# Public page shows an aggregate skill mix above the participants

Status: IN MOCK APP — #474 (PR #482)
Date: 2026-11-07
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Public page › Participants
Screen ID: Q-PUBLIC-PARTICIPANTS

## What changed
- **Public page › Participants:** when anyone is confirmed, a "Skill mix" bar (the roster's `skillMix(rows)` from #472) sits above the participant grid: total, a stacked bar and a legend with Beginner, Intermediate, Advanced and No level counts. Counts only; the cards still show no level and keep roster order.
- Hidden when nobody is confirmed. The waitlist is not counted.

## Why
- Owner request, November 7, 2026 (#474): show how many players sit at each level on the public page, never who is which level.

## Docs updated
- Business logic: docs/business_logic/product/queue/modules/players/README.md — new "Public skill mix" section
- Database design: none needed (no table change; counts come from the existing roster level in the public read)
- Screen docs: docs/screens/product/modules/queue/public-session.md — Q-PUBLIC-PARTICIPANTS skill mix

## Real app work
- `PublicSessionPage.skillMix` (`publicSkillMix` in `@rotra/data/public-session/rules`), computed in `readPublicSession` (server) and the mock public fetcher; `PublicParticipants` renders `SkillDistributionBar` from it.
