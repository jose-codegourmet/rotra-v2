import { DEFAULT_DEV_STATE } from '../mock/bridge'
export const devMenuFixtures = {
  default: { ...DEFAULT_DEV_STATE },
  offline: { ...DEFAULT_DEV_STATE, offline: true },
  expired: { ...DEFAULT_DEV_STATE, licenseExpired: true },
  saveFailure: { ...DEFAULT_DEV_STATE, nextSaveFails: true },
  conflict: { ...DEFAULT_DEV_STATE, nextSaveConflict: true },
}

export const playerRankOptions = [
  { value: 'on-leaderboard', label: 'On the leaderboard' },
  { value: 'below-threshold', label: 'Below threshold' },
  { value: 'needs-reassessment', label: 'Needs reassessment' },
  { value: 'updating', label: 'Updating' },
  { value: 'no-rank', label: 'No rank yet' },
]
export const leaderboardOptions = [
  { value: 'normal', label: 'Normal' },
  { value: 'loading', label: 'Loading' },
  { value: 'error', label: "Can't load" },
  { value: 'empty', label: 'Empty lists' },
  { value: 'empty-week', label: 'Empty week' },
]
export const leaderboardPlaceOptions = [
  { value: 'normal', label: 'As played' },
  { value: 'in-top-50', label: 'In the top 50' },
  { value: 'below-top-50', label: 'Not in the top 50' },
]
