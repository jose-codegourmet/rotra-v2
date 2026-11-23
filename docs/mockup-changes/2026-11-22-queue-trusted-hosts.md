# Club settings gets a Trusted hosts section: add and remove trusted hosts from saved players

Status: IN MOCK APP — #1003
Date: 2026-11-22
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Club settings › Trusted hosts (#club-hosts), sheets addTrustedHost and removeTrustedHost
Route: /queue/club-settings/trusted-hosts
Screen ID: Q-CLUB
Artifact: none
Components: trusted-hosts-panel, club-settings-menu
Supersedes: none
Superseded by: none

## What changed
- Club settings menu: the **Club** group gains **Trusted hosts** between Session defaults and Facebook post (`/club-settings/trusted-hosts`).
- New section **Trusted hosts**: helper copy, **Add trusted host**, the list of current trusted hosts (avatar, name, “Trusted since DATE”, identity chip, **Remove**), an empty line, and a footnote.
- **Add trusted host** sheet: search, the saved players not on the list (A–Z, avatar, name, nickname, identity chip, **Add**), **Done**. Guests and unclaimed players can be added.
- **Remove** opens “Remove NAME from trusted hosts?” with **Keep host** / **Remove host**. Removal is soft: the saved player stays and the entry keeps its dates.
- Seed: Miguel Santos (registered) and Gab Torres (unclaimed, no ROTRA account) start as trusted hosts.

## Why
- Epic #1002 (owner, November 22, 2026): “The club manages a trusted-host list drawn from its saved players.” Saved players can host without a linked ROTRA account; removing a trusted host keeps their saved-player membership and historical session host records. Host designation is informational, not authorization ([D-2026-11-22-01](../mvp/decisions/2026-11-22.md#d-2026-11-22-01)).

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: list with hosts; empty list; Add trusted host disabled when every saved player is trusted; Add sheet with results, with a search that matches nobody; Remove confirmation for a registered player (Host badge clause) and for a guest or unclaimed player (no badge clause).
- Copy:
  - “Trusted hosts”
  - “Saved players your club trusts to host its sessions. When you create a session, they're listed first in the host picker. Hosting is shown on the session; it doesn't let them sign in to Queue.”
  - “Add trusted host”, “Trusted since DATE”, “Remove”
  - “No trusted hosts yet. Add saved players you trust to host your sessions.”
  - “Removing a trusted host keeps them in your saved players, and sessions they already hosted still show them.”
  - Sheet: “Add trusted host”, “Pick a saved player your club trusts to host its sessions.”, placeholder “Search saved players by name”, “Add”, “No saved player matches.”, “Done”
  - Confirm: “Remove NAME from trusted hosts?”, “SHORT stays in your saved players. Sessions they already hosted still show them as a host.”, “They won't be listed first in the host picker any more, and their ROTRA profile stops showing the Host badge for your club.” (badge clause for registered players only), “Keep host”, “Remove host”
  - Toasts: “NAME added to trusted hosts”, “NAME removed from trusted hosts”
- Tokens: none
- Known differences: none

## Reuse plan
- Reuses as is: ListRow, Avatar, IdentityChip, Sheet, ConfirmSheet, TextInput, Button, Card — in the new panel
- Extends: ClubSettingsMenu — new `hosts` section
- New: TrustedHostsPanel — no existing Club settings panel lists saved players with an add picker and a remove confirmation
- Shares work with: later logs of epic #1002 (session Hosts picker, Host badge, public Hosts section) | none yet

## Docs updated
- Business logic: docs/business_logic/product/queue/modules/players/README.md — new “Trusted hosts” section
- Database design: docs/database_design/product/queue/modules/sessions-roster.md — `club_trusted_hosts`; docs/database_design/product/physical-schema.md — migration section; docs/database_design/product/README.md — entity inventory
- Screen docs: docs/screens/product/modules/queue/access-home.md — Q-CLUB layout and the Trusted hosts row

## Real app work
- Done in #1003: `@rotra/ui` TrustedHostsPanel (stories, meta) and the `hosts` ClubSettingsMenu section; `@rotra/data/trusted-host/*` (types, fixtures, mock store `clubTrustedHosts`, fetchers, query keys, hooks); real mode `packages/db/src/queue/club-hosts.ts`, `/api/club/trusted-hosts` Route Handlers, Prisma `ClubTrustedHost` and migration `20261122000100_club_trusted_hosts`; the Club settings container wires it.
