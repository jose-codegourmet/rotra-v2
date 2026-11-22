# Public session page: a compact Hosts section above Players and Waitlisted

Status: IN MOCK APP — #1006
Date: 2026-11-22
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Public page (viewPublic) › Participants tab and Results › Public tab preview: pubHostsHtml(), .pub-hosts / .pub-host; the demo session s-tonight seeds hosts (Miguel plays, Gab Torres does not)
Route: /s/:slug (Participants tab); /sessions/:id/public-page (operator preview)
Screen ID: Q-PUBLIC-PARTICIPANTS
Artifact: none
Components: public-hosts, public-participants
Supersedes: none
Superseded by: none

## What changed
- The Participants tab gets a compact **Hosts · N** section as its first block, above the Players grid and the Waitlist: a wrapping row of rounded chips, each a small picture and the name (nickname under it only where Players shows one).
- **Optional:** with no hosts the section is not drawn (no title, no empty text).
- Hosts show even when not playing. A host who plays is in Hosts and Players but is one roster entry: the “Participants · N” count, “N players are in” and the open slots do not change.
- Same public rule as Players: masked name and picture for a visitor; full name and nickname of a registered or unclaimed host for a signed-in Player, who can tap the chip to open the same profile card; guests and always-private players stay masked; no club nickname.
- Also shown on the Results › Public tab preview. No change to the Facebook post.

## Why
- Epic #1002 (owner, November 22, 2026), ticket #1006: “Public queue page: compact Hosts section, then Players, then Waitlisted. A host who plays appears in both Hosts and Players but counts once toward capacity.” ([D-2026-11-22-01](../mvp/decisions/2026-11-22.md#d-2026-11-22-01)).

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: two hosts (one playing, one not); one host; no hosts (section hidden); visitor (masked); signed-in Player (full names, tappable chips, You pill on the viewer's own); a host on the waitlist.
- Copy: “Hosts · N”. No badge or role text on a chip.
- Tokens: `--surface`, `--border`, `--border-strong`, `--accent`, `--on-accent`
- Known differences: none

## Reuse plan
- Reuses as is: Avatar, the Players tile name and profile-tap rule
- Extends: PublicParticipants (a `hosts` prop rendering the section first)
- New: PublicHosts (the chip row)
- Shares work with: [2026-11-22-queue-session-hosts](2026-11-22-queue-session-hosts.md), [2026-11-22-queue-change-hosts](2026-11-22-queue-change-hosts.md)

## Docs updated
- Business logic: docs/business_logic/product/queue/modules/sessions/README.md — Session hosts › On the public page
- Database design: docs/database_design/product/queue/modules/sessions-roster.md — `session_hosts` read by the public page (no schema change)
- Screen docs: docs/screens/product/modules/queue/public-session.md — Q-PUBLIC-PARTICIPANTS Hosts

## Real app work
- Done in #1006: `@rotra/ui` PublicHosts (stories, meta) rendered by PublicParticipants; `PublicSessionPage.hosts` and `PlayerSessionAccess.hosts`; mock projection `projectHosts` and seeded `sessionHosts`; real mode `readPublicSession` and `readPlayerSessionAccess` add the hosts to their existing reads (no new request). No schema change, no migration.
