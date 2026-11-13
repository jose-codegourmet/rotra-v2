import { describe, expect, it } from 'vitest'
import { rankingPolicyVersion1 } from '../fixtures/rankingSettings'
import { effectiveRankingVersion, nextRankingPolicyVersion } from './rankingSettings.rules'
import type { RankingDraft } from './rankingSettings.types'

const draft = (
  assessmentWeightBp: number,
  performanceWeightBp: number,
  recentStandardMatchThreshold = 10,
): RankingDraft => ({ assessmentWeightBp, performanceWeightBp, recentStandardMatchThreshold })

describe('versions', () => {
  const _version2 = { ...rankingPolicyVersion1, version: 2, recentStandardMatchThreshold: 12 }

  it('refuses an empty history', () => {
    expect(() => effectiveRankingVersion([])).toThrow()
  })

  it('appends version + 1 with the Manila time, leaving the old version untouched', () => {
    const before = structuredClone(rankingPolicyVersion1)
    const _next = nextRankingPolicyVersion(
      rankingPolicyVersion1,
      { ...draft(6000, 4000, 12), changeNote: '  ' },
      {
        createdByEmail: 'owner@rotra.example',
        at: Date.parse('2026-10-29T19:52:00+08:00'),
      },
    )
    expect(rankingPolicyVersion1).toEqual(before)
  })
})
