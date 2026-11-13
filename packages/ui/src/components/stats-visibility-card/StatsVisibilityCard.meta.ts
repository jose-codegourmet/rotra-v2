import type { ComponentMeta } from '@rotra/ui/meta'

export const statsVisibilityCardMeta = {
  name: 'StatsVisibilityCard',
  description:
    'P-PROFILE-PRIVACY › Stats on your profile: two switches, both on by default — Show my profile stats and Show my weekly performance — with their helpers and the saved line “Saved: profile stats shown|hidden, weekly performance shown|hidden.”',
  usage: [
    'Sits between ProfileVisibilityControl and PlayerInformationCard, as in the prototype.',
    'The container owns the mutation and the toasts (“Profile stats hidden from others”, “Profile stats shown”, “Weekly performance hidden from others”, “Weekly performance shown”).',
    'highlight="weekly" (opened from the weekly chart’s visibility chip) scrolls that row into view, outlines it in the accent for about two seconds and focuses its switch.',
    'pending disables both switches and shows “Saving…”; error shows under the saved line.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'viewAccount › Stats on your profile (sw-stats, sw-weekly), ACT.goSetting (.set-flash)',
  },
  docs: [
    'docs/mockup-changes/2026-11-13-player-stats-visibility.md',
    'docs/screens/product/modules/player-information/identity-privacy.md',
  ],
  variants: ['both on', 'stats off', 'weekly off', 'saving', 'error', 'highlighted'],
  related: ['PlayerInformationCard', 'ProfileVisibilityControl', 'WeeklyPerformanceChart', 'Switch'],
} satisfies ComponentMeta
