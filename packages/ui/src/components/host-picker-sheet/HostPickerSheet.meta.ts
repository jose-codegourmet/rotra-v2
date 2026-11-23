import type { ComponentMeta } from '@rotra/ui/meta'

export const hostPickerSheetMeta = {
  name: 'HostPickerSheet',
  description:
    'Q-SETUP › Hosts › Add host (#1004, D-2026-11-22-01): a sheet that searches the club\'s saved players, with Trusted hosts first (in list order, "Trusted host" chip) and Other saved players after (by name, identity chip). Picking a trusted host reports it at once; picking anyone else opens the "Add NAME as a trusted host?" confirmation, which says it permanently adds them to the trusted-host list.',
  usage: [
    'Pass only saved players not picked yet: already selected hosts are never listed twice.',
    'onPickNew fires after the confirmation; the container adds them to the trusted-host list (useAddTrustedHost) and then to the setup.',
    'Hosting is informational: nothing here grants a sign-in or permission.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Q-SETUP › SHEETS.hostPicker, SHEETS.confirmHostTrust',
  },
  docs: ['docs/screens/product/modules/queue/session-setup.md'],
  related: ['SetupHostsSection', 'TrustedHostsPanel', 'ConfirmSheet', 'Sheet', 'ListRow'],
} satisfies ComponentMeta
