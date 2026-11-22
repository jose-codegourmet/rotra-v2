import type { ComponentMeta } from '@rotra/ui/meta'

export const setupHostsSectionMeta = {
  name: 'SetupHostsSection',
  description:
    'SessionSetupForm page 1 › Courts › Hosts (#1004, D-2026-11-22-01): the optional list of session hosts (avatar, name, "Gets a player slot" / "Goes on the waitlist" / "Already has a slot", Host chip, Remove), Add host opening HostPickerSheet (trusted hosts first, already picked hosts left out), a notice with how many slots the new hosts take or how many go on the waitlist, and the hint that hosting is not a sign-in.',
  usage: [
    "Rendered inside SessionSetupForm's FormProvider only; it edits the hostClubPlayerIds field.",
    'placement is `hostPlacement` from @rotra/data/session-host/rules; onTrust adds a confirmed saved player to the trusted-host list (useAddTrustedHost) and resolves once added.',
    "Editing: pass savedHostIds and each person's registration so kept hosts and already registered players need no new place.",
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Q-SETUP › setupHosts()',
  },
  docs: ['docs/screens/product/modules/queue/session-setup.md'],
  related: ['SessionSetupForm', 'SetupCourtsSection', 'HostPickerSheet', 'TrustedHostsPanel'],
} satisfies ComponentMeta
