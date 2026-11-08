# Public session remaining-slot copy

Status: IN MOCK APP — #570
Date: 2026-11-08
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Public session › Want to play? card
Route: /queue/s/s-tonight
Screen ID: Q-PUBLIC-JOIN
Artifact: none
Components: join-request-card
Supersedes: none
Superseded by: none

## What changed
- The actual remaining count reads “1 slot left” for one, or “N slots left” for more than one, instead of “N of M slots open”.
- Full and active-session wording stays unchanged.

## Why
- Owner request in #570: “1 of 16 slots open” should read “1 slot left”.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: prepared with one, multiple, or zero slots; active.
- Copy: “1 slot left”, “N slots left”, “All slots taken”, “Additional players can be admitted”.
- Tokens: none.
- Known differences: none.

## Reuse plan
- Extends: join-request-card — remaining-slot copy.
- Shares work with: 2026-11-08-queue-public-join-card-layout.

## Docs updated
- Business logic: none needed; availability rules are unchanged.
- Database design: none needed; no data changes.
- Screen docs: docs/screens/product/modules/queue/public-session.md — remaining-slot copy.

## Real app work
- #570 updates the public join card and its stories to use the existing actual remaining count.
