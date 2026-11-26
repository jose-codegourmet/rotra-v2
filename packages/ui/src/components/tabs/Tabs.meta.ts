import type { ComponentMeta } from '@rotra/ui/meta'

export const tabsMeta = {
  name: 'Tabs',
  description:
    'An underlined row of views, such as the live console Session / Queue / Players / Leaderboard, with count badges.',
  usage: [
    'Pass items with label, an optional shortLabel for phones, and badges; render one TabsContent per item as children.',
    'Badge longText (" courts in use") hides on phones so tabs fit 375 px without scrolling sideways.',
    'Use tone="warn" for a badge that needs attention ("2 need attention") and tone="error" for one that failed ("Failed").',
    'Set phoneMenu to replace the tab row with a styled menu at 640 px and below; menuLabel names that menu button (it defaults to aria-label), e.g. the console tab row is "Console views" and its menu "Console view".',
    'Set phoneMenu="drawer" with drawerTitle ("Live session") for the live console: at 640 px and below a button shows the current view and its first chip and opens a left drawer (TabDrawer) listing every view with its chip. Other screens keep the dropdown.',
    'For filters that do not switch whole views use SegmentedControl.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Live console › Session / Queue / Players / Leaderboard tabs (.tabs)',
  },
  docs: ['docs/screens/product/experience-contract.md#layout-and-device-behavior'],
  related: ['SegmentedControl', 'Chip', 'TabMenu', 'TabDrawer'],
} satisfies ComponentMeta
