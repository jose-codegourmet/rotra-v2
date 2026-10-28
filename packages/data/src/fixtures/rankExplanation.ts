/** Prototype rank-detail scenarios, level indexes are zero-based. */
export const rankExplanationPlayer = {
  firstName: 'Jose',
  levelIndex: 3,
  stale: false,
  levelLabel: 'Intermediate Low',
}
export const rankExplanationNoRank = {
  ...rankExplanationPlayer,
  levelIndex: null,
  levelLabel: 'Not calculated',
}
export const rankExplanationStale = { ...rankExplanationPlayer, stale: true }
