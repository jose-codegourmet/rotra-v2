# Session setup gets an optional Hosts field: pick several hosts, each registered as a player

Status: IN MOCK APP — #1004
Date: 2026-11-22
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Q-SETUP page 1 › Courts › Hosts (setupHosts(), #f-hosts), review row Hosts, sheets hostPicker and confirmHostTrust, saveSetup › applyHosts()
Route: /queue/sessions/new, /queue/sessions/:id/edit
Screen ID: Q-SETUP
Artifact: none
Components: setup-hosts-section, host-picker-sheet, session-setup-form, setup-notes-review-section
Supersedes: none
Superseded by: none

## What changed
- Page 1 › Courts, under the slot budget: an optional **Hosts** field (“Hosts · optional”, **+ Add host**). Each picked host shows as a row: avatar, name, a line saying what saving does for them (“Gets a player slot”, “Goes on the waitlist”, “Already has a slot”, “Already on the waitlist”, “Hosting this session”), a **Host** chip and **Remove**. Empty: “No hosts. Add your trusted hosts, or anyone from your saved players.”
- A notice counts the slots the new hosts take (“2 hosts take 2 of 16 slots.”, or “… of the N open slots.” when editing). Past the open slots it warns that the last ones go on the waitlist when saved (the existing preparation rule for a full session).
- **Add host** sheet: search, **Trusted hosts** first (list order, “Trusted host” chip), then **Other saved players** (A–Z, identity chip). Hosts already picked are not listed. Picking a trusted host adds them at once.
- Picking another saved player opens “Add NAME as a trusted host?”: it says this permanently adds them to the club's trusted hosts (removable later in Club settings › Trusted hosts). **Add trusted host** adds them to the trusted-host list and as a host; **Back** returns to the picker.
- The review (page 3) gains a **Hosts** row (names, or None) with Edit → page 1.
- Saving: every new host gets a host row and is registered as a player unless already on the roster or waitlist: a slot while one is open, otherwise the waitlist, with their saved level. Every date of a repeating series gets the same hosts. Removing a host in Edit preparation ends only the host row; their slot stays. The save toast adds “· N hosts registered” / “· N hosts waitlisted”.

## Why
- Epic #1002 (owner, November 22, 2026), ticket #1004: “Session creation can select multiple trusted hosts. Assigning a host auto-registers that person as a playing participant, consuming one capacity slot, without duplicating an existing registration.” and “The session creator may pick another saved player as host via a plus picker. A confirmation says this permanently adds them to the club's trusted-host list.” ([D-2026-11-22-01](../mvp/decisions/2026-11-22.md#d-2026-11-22-01)). Capacity follows the existing rule: before Start, a player added to a full session goes on the waitlist ([players › Slots and waitlist](../business_logic/product/queue/modules/players/README.md#slots-and-waitlist)).

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: no hosts; two hosts on a new session (2 of 16 slots); edit with hosts past the open slots (waitlist warning); edit with a kept host and one already on the roster; Add host disabled when every saved player is picked; picker with trusted hosts and others, with every trusted host picked, with a search that matches nobody; the trusted-host confirmation.
- Copy:
  - “Hosts · optional”, “Add host”, “Host”, “Remove”
  - “No hosts. Add your trusted hosts, or anyone from your saved players.”
  - “Gets a player slot”, “Goes on the waitlist”, “Already has a slot”, “Already on the waitlist”, “Hosting this session”
  - “N hosts take N of 16 slots. Each host is registered as a player when you save.” / “… of the N open slots.”
  - “Only N slots open. The last N hosts go on the waitlist when you save, like any player added to a full session.”
  - “Hosts are shown on the session. Each one is also registered as a player and takes one slot, unless they're already in. Hosting doesn't let anyone sign in to Queue.” (+ “Removing a host keeps their player slot.” when editing)
  - Sheet: “Add host”, placeholder “Search saved players by name”, “Trusted hosts”, “Other saved players”, “Trusted host”, “Picking one asks first: it adds them to your club's trusted hosts.”, “No trusted hosts yet.” / “No trusted host left to pick.”, “No saved player matches.”, “Done”
  - Confirm: “Add NAME as a trusted host?”, “This permanently adds SHORT to your club's trusted hosts, so they're listed first in the host picker from now on. You can remove them later in Club settings › Trusted hosts.”, “They host this session and are registered as a player unless they're already in. Hosting doesn't let them sign in to Queue.”, “Back”, “Add trusted host”
  - Toasts: “NAME added as a host” (mockup), “NAME added to trusted hosts” (app; mockup: “… and as a host”), “NAME removed as a host” (mockup), save toast suffixes “· N hosts registered”, “· N hosts waitlisted”
- Tokens: none
- Known differences: the app toasts only the trusted-host addition and the save, not each pick or removal.

## Reuse plan
- Reuses as is: ListRow, Avatar, Chip, IdentityChip, Sheet, ConfirmSheet, TextInput, Button, Notice, Icon
- Extends: SessionSetupForm (`hosts` prop, `hostClubPlayerIds` field), SetupNotesReviewSection (`hostNames` row)
- New: SetupHostsSection (the field), HostPickerSheet (picker + trusted-host confirmation; TrustedHostsPanel's Add sheet has no grouping or confirmation)
- Shares work with: [2026-11-22-queue-trusted-hosts](2026-11-22-queue-trusted-hosts.md) (trusted-host list); later logs of epic #1002 (changing hosts mid-session, public Hosts section)

## Docs updated
- Business logic: docs/business_logic/product/queue/modules/sessions/README.md — setup table and “Session hosts”; docs/business_logic/product/queue/modules/players/README.md — Trusted hosts bullet
- Database design: docs/database_design/product/queue/modules/sessions-roster.md — `session_hosts`; docs/database_design/product/physical-schema.md — migration section; docs/database_design/product/README.md — entity inventory
- Screen docs: docs/screens/product/modules/queue/session-setup.md — page 1 › Courts › Hosts, the picker and the review row

## Real app work
- Done in #1004: `@rotra/ui` SetupHostsSection and HostPickerSheet (stories, meta), SessionSetupForm `hosts` + `hostClubPlayerIds`, review row; `@rotra/data/session-host/*` (types, rules `hostPlacement`, fetchers with the mock write `assignSessionHosts`, query keys, `useSessionHosts`), mock store `sessionHosts`, `QueueSessionInput.hostClubPlayerIds` in create/update; real mode `packages/db/src/queue/session-hosts.ts` (written in the create/edit transaction), `GET /api/sessions/[sessionId]/hosts`, Prisma `SessionHost` and migration `20261122000200_session_hosts`; the Q-SETUP container wires it with `useTrustedHosts` / `useAddTrustedHost`.
