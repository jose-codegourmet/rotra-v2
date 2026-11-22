# Finished sessions keep their hosts: Hosts on the session record

Status: IN MOCK APP — #1008
Date: 2026-11-22
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Session record (viewHistory) › Players tab (recordHostsHtml()) and Public page tab (histPublicPane() › pubHostsHtml()); sessionHostPeople(), freezeHosts() on Session done, mergePlayer() host rows; the past session h2 (Sunday Night Queue) seeds Bea Castillo as its host (no longer a trusted host) and Gab Torres removed an hour in; seedTrustedHosts() keeps Bea's removed row
Route: /sessions/:id/record (Players and Public page tabs); /s/:slug (a finished session's Participants tab)
Screen ID: Q-HISTORY, Q-PUBLIC-PARTICIPANTS
Artifact: none
Components: public-hosts, public-page-summary
Supersedes: none
Superseded by: none

## What changed
- **Session done freezes the hosts.** The hosts current when the session finishes are its hosts from then on, each with the name they had then. A host removed before the end is not one of them (the row stays as history).
- **Session record › Players tab:** a compact **Hosts · N** row above the player cards, the #1006 chips (small picture and name) with the club's full names, and the line “The hosts this session ended with. Removing a trusted host or a saved player later doesn't change them.” No hosts: nothing is drawn.
- **Session record › Public page tab** and the **public page** of a finished session: the #1006 Hosts section now reads the frozen hosts, masked for visitors as before.
- The hosts still show after the club takes them off **Trusted hosts**, deletes the saved player, or moves the record into another (**Same person**); a later rename of the saved player does not change a finished session.
- **Same person** during an open session moves that session's current host row to the other record (or ends it, if the other record already hosts it). Finished sessions keep theirs.
- Demo: Sunday Night Queue (a week ago) shows Bea Castillo (the mock app's Aaron) as its host although she was taken off Trusted hosts two days ago; Gab Torres hosted it only for the first hour and is not shown.

## Why
- Epic #1002 (owner, November 22, 2026), ticket #1008: “Removing a trusted host removes their current badge and future picker eligibility, but not their saved player membership nor historical session host records. Past sessions keep host snapshots.” ([D-2026-11-22-01](../mvp/decisions/2026-11-22.md#d-2026-11-22-01)).

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: a finished session with a host who is no longer trusted; a host removed mid-session (not shown); a host whose saved player was deleted or moved into another record (shown by the kept name); no hosts (row hidden); an invalid session (same rule).
- Copy: “Hosts · N”; “The hosts this session ended with. Removing a trusted host or a saved player later doesn't change them.”
- Tokens: `--surface`, `--border`, `--fg2`
- Known differences: none

## Reuse plan
- Reuses as is: Avatar; PublicHosts chips (#1006)
- Extends: PublicHosts (an optional `note` line), PublicPageSummary (a `hosts` slot under the Participants heading)
- New: none
- Shares work with: [2026-11-22-queue-public-hosts](2026-11-22-queue-public-hosts.md), [2026-11-22-queue-change-hosts](2026-11-22-queue-change-hosts.md), [2026-11-22-queue-trusted-hosts](2026-11-22-queue-trusted-hosts.md)

## Docs updated
- Business logic: docs/business_logic/product/queue/modules/sessions/README.md — Session hosts › Finished sessions keep their hosts
- Database design: docs/database_design/product/queue/modules/sessions-roster.md — `session_hosts` `name_snapshot`, `frozen_at`; docs/database_design/product/physical-schema.md
- Screen docs: docs/screens/product/modules/queue/results-sharing.md — Q-HISTORY Hosts; docs/screens/product/modules/queue/public-session.md — a finished session's Hosts

## Real app work
- Done in #1008: migration `20261122000300_session_host_snapshots` (`name_snapshot`, `frozen_at`, checks and guard trigger, backfill), freeze in `finalizeSession` and `invalidateSession`, Same person moves open sessions' host rows, reads by `shownHostRows` in `readPublicSession`, `readPlayerSessionAccess` and `listSessionHosts`; mock `sessionHost.history.ts` (freeze, move, shown rows) and the h2 fixture; `@rotra/ui` PublicHosts `note`, PublicPageSummary `hosts`; RecordPlayersTab and RecordPublicTab render the hosts.
