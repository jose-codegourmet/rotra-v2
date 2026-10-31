import type { ComponentMeta } from '@rotra/ui/meta'

export const sheetMeta = {
  name: 'Sheet',
  description:
    'The container for every task and dialog: centered on wide screens, docked to the bottom on phones, with a scrim, a focused title and a close button.',
  usage: [
    'Controlled: pass open and onOpenChange. Focus returns to whatever opened it when it closes.',
    'Put the named primary action last in footer, after Back or Cancel.',
    'For an irreversible or important confirmation (D- dialogs) use ConfirmSheet.',
    'Set dismissible={false} and hideClose while a permanent save is pending.',
    'Motion matches the prototype and is instant under reduced motion.',
  ],
  prototype: {
    file: 'app/mocksups-app/queue-app/rotra-queue.html',
    screen: 'Shared styles › .scrim, .sheet (.wide), sheetShell()',
  },
  docs: [
    'docs/screens/product/dialogs.md',
    'docs/screens/product/experience-contract.md#accessibility-and-interaction',
  ],
  variants: ['default', 'wide'],
  related: ['ConfirmSheet', 'Button'],
} satisfies ComponentMeta
