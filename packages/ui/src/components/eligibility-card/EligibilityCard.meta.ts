import type { ComponentMeta } from '@rotra/ui/meta'

export const eligibilityCardMeta = {
  name: 'EligibilityCard',
  description:
    'Leaderboard eligibility: a player’s progress toward the overall leaderboard. On the profile its head carries the shared rank (Shared rank, the rank label and status chip, Share, How this rank works) and the rank status line.',
  usage: [
    'Use on the profile while the player does not qualify (or needs reassessment, or has no position yet); once they qualify with a position use ProfileRankingCard.',
    'rank adds the shared rank head (the profile no longer has a separate Shared rank card); onShare only on your own profile with a rank.',
    'rankText is the rank status line (rankStatus), e.g. the reassessment note.',
  ],
  prototype: { file: 'apps/mockup/player-app/rotra-player.html', screen: 'eligibility(), rankHead()' },
  docs: ['docs/mockup-changes/2026-11-13-player-ranking-card.md'],
  variants: ['qualifies', 'below threshold', 'needs reassessment', 'with rank head', 'not calculated'],
  related: ['ProfileRankingCard', 'RankShareCard'],
} satisfies ComponentMeta
