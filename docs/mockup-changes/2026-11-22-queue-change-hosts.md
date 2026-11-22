# Change a session's hosts before and during the session: a compact Hosts card

Status: IN MOCK APP — #1005
Date: 2026-11-22
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Q-PREPARE Overview (prepOverview), Settings tab (prepSettings) and the live Settings (liveSettings): hostsCard(); sheets hostPicker and confirmHostTrust in live mode; addLiveHost(), ACT.removeSessionHost
Route: /queue/sessions/:id/preparation (prepared and live; the console's Settings opens it)
Screen ID: Q-PREPARE
Artifact: none
Components: session-hosts-card, host-picker-sheet
Supersedes: none
Superseded by: none

## What changed
- A compact **Hosts** card on Q-PREPARE (prepared and live): “Hosts · N”, **+ Add host**, a row per host (avatar, name, a line saying where their player registration stands: “Playing · has a slot”, “On the waitlist”, “Not on the roster”, a **Host** chip and **Remove**). Empty: “No hosts. Add your trusted hosts, or anyone from your saved players.” A hint says how many slots are open and that a new host takes one unless already in, or goes on the waitlist when every slot is taken.
- **Add host** reuses the setup's Add host sheet (trusted hosts first, then other saved players; hosts already on the session are not listed) and its “Add NAME as a trusted host?” confirmation for anyone else. The change is saved at once: toast “NAME added as a host · 1 host registered” / “· 1 host waitlisted”.
- **Remove** ends the host designation at once (toast “NAME removed as a host”). The player keeps their slot or waitlist place and stays a trusted host.
- Withdrawing, stepping down to the waitlist, no-show and removing from the roster never remove the host designation: a withdrawn host stays listed and shows “Not on the roster”.
- Live: a host added to a slot is present with a locked level, like any player admitted during play; a full live session sends them to the waitlist. A host who isn't on the roster or waitlist and has no saved level is refused (“NAME has no saved level. Add them as a player with a level first, then add them as a host.”), because levels are locked.
- Also: a waitlisted player with no level (a host with no saved level, added before Start) is skipped by **Fill open slots**, and **Give slot** says “Choose a level before giving a slot.”

## Why
- Epic #1002 (owner, November 22, 2026), ticket #1005: “Hosts can be changed during an active session. Removing a host designation never removes their player registration; withdrawing as a player never removes the host designation. Existing queue controls handle withdrawal/rejoin and waitlist.” and “Club credentials remain the only way to operate the Queue app. Host designation is informational, NOT authorization.” ([D-2026-11-22-01](../mvp/decisions/2026-11-22.md#d-2026-11-22-01)).

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: no hosts; hosts who play; a host on the waitlist; a withdrawn host (“Not on the roster”); full session (“Every slot is taken…”); Add host disabled when every saved player is a host; the picker and the trusted-host confirmation in live mode; the no-level refusal during play.
- Copy:
  - “Hosts · N”, “Add host”, “Host”, “Remove”
  - “Playing · has a slot”, “On the waitlist”, “Not on the roster”
  - “N slots open. A new host takes one unless they're already in.” / “Every slot is taken. A new host who isn't in yet goes on the waitlist.”
  - “Removing a host keeps their player place, and withdrawing keeps the host designation. Hosting doesn't let anyone sign in to Queue.” (live: without the withdrawing clause)
  - Toasts: “NAME added as a host · N hosts registered / waitlisted”, “NAME removed as a host”
- Tokens: none
- Known differences: the mockup also shows the card on the live console's Settings tab and the prepared Settings tab; the app shows it on the preparation Overview, which the console's Session settings opens. The mockup's trusted-host addition toasts “… added as a host”; the app also toasts “NAME added to trusted hosts”.

## Reuse plan
- Reuses as is: HostPickerSheet (with its trusted-host confirmation), ListRow, Avatar, Chip, Card, Button, Icon
- Extends: none
- New: SessionHostsCard (the card; SetupHostsSection is a form field and can't be reused as is)
- Shares work with: [2026-11-22-queue-session-hosts](2026-11-22-queue-session-hosts.md) (setup Hosts field and picker), [2026-11-22-queue-trusted-hosts](2026-11-22-queue-trusted-hosts.md)

## Docs updated
- Business logic: docs/business_logic/product/queue/modules/sessions/README.md — “Session hosts” (changing hosts); docs/business_logic/product/queue/modules/players/README.md — Trusted hosts bullet
- Database design: docs/database_design/product/queue/modules/sessions-roster.md — `session_hosts` (changed during a session; no schema change)
- Screen docs: docs/screens/product/modules/queue/session-setup.md — Q-PREPARE Hosts card

## Real app work
- Done in #1005: `@rotra/ui` SessionHostsCard (stories, meta); container `SessionHosts` in the preparation Overview; `@rotra/data/session-host/*` (`addSessionHost`, `removeSessionHost`, `useAddSessionHost`, `useRemoveSessionHost`; the live no-level refusal); real mode `addSessionHost` / `removeSessionHost` in `packages/db/src/queue/session-hosts.ts`, `POST /api/sessions/[sessionId]/hosts`, `DELETE /api/sessions/[sessionId]/hosts/[clubPlayerId]`; the mock store's automatic fills skip waitlisted players with no level, like real mode. No schema change, no migration.
