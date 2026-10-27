import type { ComponentMeta } from '@rotra/ui/meta'

export const tabsMeta = {
  name: 'Tabs',
  description:
    'An underlined row of views, such as the live console Session / Queue / Players / Leaderboard, with count badges.',
  usage: [
    'Pass items with label, an optional shortLabel for phones, and badges; render one TabsContent per item as children.',
    'Badge longText (" courts in use") hides on phones so tabs fit 375 px without scrolling sideways.',
    'Use tone="warn" for a badge that needs attention ("2 need attention").',
    'For filters that do not switch whole views use SegmentedControl.',
  ],
  prototype: {
    file: 'docs/frames/queue-app/rotra-queue.html',
    screen: 'Live console › Session / Queue / Players / Leaderboard tabs (.tabs)',
  },
  docs: ['docs/screens/product/experience-contract.md#layout-and-device-behavior'],
  related: ['SegmentedControl', 'Chip'],
} satisfies ComponentMeta
