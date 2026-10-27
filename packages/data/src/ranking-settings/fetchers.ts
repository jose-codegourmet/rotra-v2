import { requireOnline } from '../mock/bridge'
import { delay } from '../mock/latency'
import { mockStore, readMockState } from '../mock/store'
import type { RankingSettings } from './rankingSettings.types'
export async function getRankingSettings(signal?: AbortSignal): Promise<RankingSettings> {
  await delay(200, signal)
  requireOnline()
  return readMockState().rankingSettings
}
/** Development-only configuration edit, mirroring the prototype's Admin settings controls. */
export async function setRankingSettings(settings: RankingSettings): Promise<RankingSettings> {
  if (
    !Number.isInteger(settings.assessmentWeightPercent) ||
    settings.assessmentWeightPercent < 0 ||
    settings.assessmentWeightPercent > 100 ||
    !Number.isInteger(settings.matchRequirement) ||
    settings.matchRequirement < 1 ||
    settings.matchRequirement > 40
  )
    throw new Error('Invalid ranking settings')
  mockStore.update((draft) => {
    draft.rankingSettings = { ...settings }
  })
  return settings
}
