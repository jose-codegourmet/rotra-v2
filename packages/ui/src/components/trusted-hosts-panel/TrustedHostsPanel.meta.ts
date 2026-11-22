import type { ComponentMeta } from '@rotra/ui/meta'

export const trustedHostsPanelMeta = {
  name: 'TrustedHostsPanel',
  description:
    'Club settings › Trusted hosts (D-2026-11-22-01): the club’s trusted-host list drawn from its saved players (avatar, name, “Trusted since DATE”, identity chip, Remove), the Add trusted host sheet that searches saved players not on the list, and the “Remove NAME from trusted hosts?” confirmation.',
  usage: [
    'Use as the "hosts" section of Club settings (/club-settings/trusted-hosts).',
    'Pass hosts (the current list, joined to the saved players) and candidates (saved players not on it). Guests and unclaimed players can be trusted hosts.',
    'The panel keeps the Add sheet and the Remove confirmation; onAdd fires after Add (the sheet closes), onRemove after Remove host. The container saves and toasts “NAME added to trusted hosts” / “NAME removed from trusted hosts”.',
    'Being a trusted host is informational only: it never gives a role, permission or sign-in. Removing one never removes the saved player.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen:
      'Club settings › Trusted hosts (#club-hosts), sheets addTrustedHost and removeTrustedHost',
  },
  docs: [
    'docs/screens/product/modules/queue/access-home.md',
    'docs/mockup-changes/2026-11-22-queue-trusted-hosts.md',
    'docs/mvp/decisions/2026-11-22.md',
  ],
  related: ['ClubSettingsMenu', 'ClubInvitePanel', 'ConfirmSheet', 'ListRow', 'IdentityChip'],
} satisfies ComponentMeta
