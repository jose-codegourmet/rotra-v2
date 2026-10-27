export type RankStatus =
  | 'not-calculated'
  | 'needs-reassessment'
  | 'on-leaderboard'
  | 'updating'
  | 'qualifies'
  | 'provisional'

/** Copy-only status mapping; eligibility and ranking are calculated in @rotra/data. */
export function rankStatusLabel(status: RankStatus) {
  return {
    'not-calculated': 'Not calculated',
    'needs-reassessment': 'Needs reassessment',
    'on-leaderboard': 'On the leaderboard',
    updating: 'Updating',
    qualifies: 'Qualifies',
    provisional: 'Provisional',
  }[status]
}
