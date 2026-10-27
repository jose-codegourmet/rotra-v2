/** Prototype rank-detail scenarios, level indexes are zero-based. */
export const rankExplanationPlayer = {
  firstName: 'Migs',
  levelIndex: 5,
  stale: false,
  levelLabel: 'Intermediate High',
}
export const rankExplanationNoRank = {
  ...rankExplanationPlayer,
  levelIndex: null,
  levelLabel: 'Not calculated',
}
export const rankExplanationStale = { ...rankExplanationPlayer, stale: true }
