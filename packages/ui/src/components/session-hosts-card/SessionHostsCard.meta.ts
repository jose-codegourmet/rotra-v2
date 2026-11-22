import type { ComponentMeta } from '@rotra/ui/meta'

export const sessionHostsCardMeta = {
  name: 'SessionHostsCard',
  description:
    'Session management › Hosts (#1005, D-2026-11-22-01): the compact Hosts card of Q-PREPARE, before and during the session. Lists the session\'s hosts (avatar, name, "Host" chip, where their player registration stands, Remove) with an Add host button that opens HostPickerSheet (trusted hosts first, then other saved players; the trusted-host confirmation for anyone else).',
  usage: [
    'Place it in the Overview tab of Q-PREPARE (prepared and live) next to the Setup card.',
    'Pass hosts (current host rows joined to the saved players and their roster or waitlist place) and candidates (saved players who are not hosts yet).',
    'onAdd fires for a trusted host; onAddNew fires after the trusted-host confirmation, and the container adds them to the trusted-host list (useAddTrustedHost) and then to the session (useAddSessionHost).',
    'Remove ends the host designation only (useRemoveSessionHost): the player keeps their slot or waitlist place and their trusted-host status. Withdrawing never removes a host.',
    'Hosting is informational: nothing here grants a sign-in or permission.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen:
      'Q-PREPARE › Hosts card (hostsCard), sheets hostPicker and confirmHostTrust (live mode)',
  },
  docs: [
    'docs/screens/product/modules/queue/session-setup.md',
    'docs/mockup-changes/2026-11-22-queue-change-hosts.md',
    'docs/mvp/decisions/2026-11-22.md',
  ],
  related: ['HostPickerSheet', 'SetupHostsSection', 'SessionSetupCard', 'ListRow'],
} satisfies ComponentMeta
