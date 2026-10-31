import type { ComponentMeta } from '@rotra/ui/meta'

export const iconButtonMeta = {
  name: 'IconButton',
  description:
    'A button that holds only an icon, such as close, back, menu or the theme switch. Always carries an accessible label.',
  usage: [
    'Pass label: it becomes aria-label and the tooltip.',
    'Destructive and irreversible actions never use an icon alone; use Button with text.',
    'Usually variant="ghost" size="xs" in top bars and sheet headers, as in the prototypes.',
  ],
  prototype: {
    file: 'app/mocksups-app/queue-app/rotra-queue.html',
    screen: 'Shared styles › .icon-btn (top bar menu, theme switch, sheet close)',
  },
  docs: ['docs/screens/product/experience-contract.md#accessibility-and-interaction'],
  variants: ['secondary', 'primary', 'ghost', 'danger', 'md', 'sm', 'xs'],
  related: ['Button', 'Icon'],
} satisfies ComponentMeta
