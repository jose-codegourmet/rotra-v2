import type { ComponentMeta } from '@rotra/ui/meta'

export const publicHostsMeta = {
  name: 'PublicHosts',
  description:
    'Public session page › Hosts (#1006, D-2026-11-22-01): a compact row of picture-and-name chips for the session’s hosts, above Players and Waitlisted. Optional: no hosts renders nothing.',
  usage: [
    'PublicParticipants renders it first when given hosts; use it alone only for previews and stories.',
    'Names follow the page rule exactly like Players: masked for visitors and guests, the full name and nickname for a registered player seen by a signed-in viewer (D-2026-11-07-06, D-2026-11-09-02). The club’s own nickname is never shown (D-2026-11-18-03).',
    'A host who plays is in Players too. This section never changes the player count or open slots.',
    'Signed-in viewers pass onOpenHost; a host with a profile kind becomes a button opening the same profile card as Players. Visitors pass nothing.',
    'Hosting is informational; the chip has no role label and grants nothing.',
    'Finished sessions (#1008): pass the hosts the session ended with (frozen at Session done, by the name kept then); they show even after trusted-host removal, saved-player deletion or a Same person move. A host removed mid-session is not passed.',
    'The session record reuses it: the Public page tab inside PublicPageSummary (`hosts`), and the Players tab with full names (`masked: false`) and the `note` line.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Public page › viewPublic() › Participants tab › Hosts (.pub-hosts)',
  },
  docs: [
    'docs/screens/product/modules/queue/public-session.md',
    'docs/mockup-changes/2026-11-22-queue-public-hosts.md',
    'docs/mockup-changes/2026-11-22-queue-past-session-hosts.md',
    'docs/mvp/decisions/2026-11-22.md',
  ],
  related: ['PublicParticipants', 'PublicParticipantTile', 'PublicPageSummary', 'Avatar'],
} satisfies ComponentMeta
