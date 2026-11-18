import type { LeaderboardPlace } from '../leaderboard/leaderboard.types'

/** Example places from the period profile and dialog designs. */
export const profileLeaderboardStoryPlaces = [
  { period: 'year', position: 17, wins: 106 },
  { period: 'month', position: 24, wins: 12 },
  { period: 'week', position: 39, wins: 1 },
] as const satisfies readonly LeaderboardPlace[]

/** Prototype menu scenarios for rank-component stories. */
export const joseRankStates = {
  onLeaderboard: {
    level: 4,
    levelLabel: 'Intermediate Low',
    position: 39,
    status: 'On the leaderboard',
    sentence: '39 of 53 players on the overall ROTRA leaderboard.',
  },
  belowThreshold: {
    level: 4,
    levelLabel: 'Intermediate Low',
    position: null,
    status: 'Provisional',
    sentence: 'No overall position yet. 7 of 10 standard matches in the last three months.',
  },
  needsReassessment: {
    level: 4,
    levelLabel: 'Intermediate Low',
    position: null,
    status: 'Needs reassessment',
    sentence: 'A club needs to reassess this rank before it returns to the leaderboard.',
  },
  noRankYet: {
    level: null,
    levelLabel: undefined,
    position: null,
    status: 'Not calculated',
    sentence: 'No rank yet.',
  },
} as const
