import type { ComponentMeta } from '@rotra/ui/meta'

export const profileRankingCardMeta = {
  name: 'ProfileRankingCard',
  description:
    'Leaderboard ranking on the profile once a player qualifies and has a position: compact, about this player only — Shared rank (label and status chip) on the left, an Overall box (#N of M) on the right that opens the leaderboard at their row, and a footer with the qualifying count, Share (own) and How this rank works.',
  usage: [
    'Replaces EligibilityCard when recentCount ≥ the requirement, the player is not in reassessment and has a position; otherwise use EligibilityCard with its rank head.',
    'onOpenLeaderboard: the container routes to the leaderboard at this row, which scrolls into view and flashes.',
    'onShare only on your own profile with a rank.',
    'About 210 px tall; no neighbouring rows (pass 3).',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'rankingCard() (.rk-card, .rk-compact, .rk-c-pos, .rk-c-foot), ACT.seeOnBoard',
  },
  docs: ['docs/mockup-changes/2026-11-13-player-ranking-card.md'],
  variants: ['own', 'someone else', 'top three', 'updating'],
  related: ['EligibilityCard', 'LeaderboardRow', 'RankShareCard'],
} satisfies ComponentMeta
