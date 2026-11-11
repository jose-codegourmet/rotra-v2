# Requests before Start: no Match tab; match requests exist only while the session is live

Status: NEW
Date: 2026-11-11
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Preparation › Requests card (and the Requests sheet)
Route: /queue/sessions/s-tonight/preparation
Screen ID: Q-PREP (Requests), D-2026-11-09-05
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: requests-panel, tabs
Supersedes: none
Superseded by: none

## What changed
- Before: the Requests card on the preparation page showed two tabs, **Join · N** and **Match · 0**, even though the session had not started.
- After: before Start session the card has no tabs and lists join requests and drop-out notices only; its intro reads “Join requests and drop-out notices from the session page. Nothing changes until you act on one.” and the Requests count badge ignores match requests. Once the session is live the Join and Match tabs appear as before. The public page already offers **Request a match** only during a live session.

## Why
- Owner comment on the Queue artifact, November 11, 2026: “this doesn't make sense because the game hasn't started yet, there shouldn't be match requests”.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: preparation with join requests, preparation with none, live session (tabs back), Requests sheet on the live console.
- Copy: **Join requests and drop-out notices from the session page. Nothing changes until you act on one.** (before Start); the live copy is unchanged.
- Tokens: none
- Known differences: none

## Reuse plan
- Reuses as is: requests-panel, tabs
- Extends: requests-panel (tabs only while live)
- New: none
- Shares work with: none

## Docs updated
- none yet — proposal pending owner approval; D-2026-11-09-05 and the preparation screen doc follow when approved

## Real app work
- `@rotra/ui` RequestsPanel: render the Match tab and count match requests only when the session status is active.
