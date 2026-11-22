import type { ComponentMeta } from '@rotra/ui/meta'

export const sessionHostsMeta = {
  name: 'SessionHosts',
  description:
    "Session management › Hosts (#1005, D-2026-11-22-01): wires SessionHostsCard to the session's hosts, the club's trusted hosts, saved players and the roster. Add host registers the person as a player unless they are already in (a slot while one is open, else the waitlist); a non-trusted saved player is added to the trusted-host list after the picker's confirmation, then to the session. Remove ends the host designation only.",
  usage: [
    'Preparation Overview, prepared and live (the live Settings of the console opens the same page).',
    'Removing a host never withdraws the player or removes the trusted-host status; withdrawing never removes a host. Club credentials only: no role, no sign-in.',
  ],
  docs: [
    'docs/screens/product/modules/queue/session-setup.md',
    'docs/mockup-changes/2026-11-22-queue-change-hosts.md',
  ],
} satisfies ComponentMeta
