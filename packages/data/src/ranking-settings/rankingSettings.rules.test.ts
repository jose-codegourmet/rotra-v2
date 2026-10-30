import {
  RANKING_THRESHOLD_ERROR,
  RANKING_WEIGHT_ERROR,
  rankingWeightTotalError,
} from '@rotra/schema/ranking-settings'
import { describe, expect, it } from 'vitest'
import { rankingPolicyVersion1 } from '../fixtures/rankingSettings'
import {
  basisPointsToPercent,
  diffRows,
  effectiveRankingVersion,
  manilaIsoString,
  nextRankingPolicyVersion,
  percentToBasisPoints,
  rankingSettingsOf,
  validateRankingDraft,
} from './rankingSettings.rules'
import type { RankingDraft } from './rankingSettings.types'

const draft = (
  assessmentWeightBp: number,
  performanceWeightBp: number,
  recentStandardMatchThreshold = 10,
): RankingDraft => ({ assessmentWeightBp, performanceWeightBp, recentStandardMatchThreshold })

describe('basis points', () => {
  it.each([
    [70, 7000],
    [30, 3000],
    [0, 0],
    [100, 10000],
    [70.5, 7050],
  ])('%s%% is %i basis points', (percent, basisPoints) => {
    expect(percentToBasisPoints(percent)).toBe(basisPoints)
    expect(basisPointsToPercent(basisPoints)).toBe(percent)
  })

  it('round-trips every whole percentage', () => {
    for (let percent = 0; percent <= 100; percent++)
      expect(basisPointsToPercent(percentToBasisPoints(percent))).toBe(percent)
  })

  it('rounds float noise to whole basis points', () => {
    expect(percentToBasisPoints(0.29 * 100)).toBe(2900)
  })
})

describe('validateRankingDraft', () => {
  it.each([
    [7000, 3000],
    [10000, 0],
    [0, 10000],
    [7050, 2950],
  ])('accepts %i / %i', (assessment, performance) => {
    expect(validateRankingDraft(draft(assessment, performance))).toEqual({})
  })

  it('rejects 70 / 40 on the total only', () => {
    expect(validateRankingDraft(draft(7000, 4000))).toEqual({
      total: rankingWeightTotalError(110),
    })
  })

  it.each([-1, 10001, 70.5, Number.NaN])('rejects a weight of %s', (weight) => {
    expect(validateRankingDraft(draft(weight, 3000))).toEqual({
      assessmentWeightBp: RANKING_WEIGHT_ERROR,
    })
    expect(validateRankingDraft(draft(7000, weight))).toEqual({
      performanceWeightBp: RANKING_WEIGHT_ERROR,
    })
  })

  it.each([1, 10, 40])('accepts a requirement of %i matches', (threshold) => {
    expect(validateRankingDraft(draft(7000, 3000, threshold))).toEqual({})
  })

  it.each([0, -1, 2.5, 41, 100])('rejects a requirement of %s matches', (threshold) => {
    expect(validateRankingDraft(draft(7000, 3000, threshold))).toEqual({
      recentStandardMatchThreshold: RANKING_THRESHOLD_ERROR,
    })
  })
})

describe('versions', () => {
  const version2 = { ...rankingPolicyVersion1, version: 2, recentStandardMatchThreshold: 12 }

  it('the newest version is in effect, whatever the order', () => {
    expect(effectiveRankingVersion([rankingPolicyVersion1, version2])).toBe(version2)
    expect(effectiveRankingVersion([version2, rankingPolicyVersion1])).toBe(version2)
  })

  it('refuses an empty history', () => {
    expect(() => effectiveRankingVersion([])).toThrow()
  })

  it('maps a version to the reader shape', () => {
    expect(rankingSettingsOf(rankingPolicyVersion1)).toEqual({
      assessmentWeightPercent: 70,
      matchRequirement: 10,
    })
  })

  it('appends version + 1 with the Manila time, leaving the old version untouched', () => {
    const before = structuredClone(rankingPolicyVersion1)
    const next = nextRankingPolicyVersion(
      rankingPolicyVersion1,
      { ...draft(6000, 4000, 12), changeNote: '  ' },
      {
        createdByEmail: 'owner@rotra.example',
        at: Date.parse('2026-10-29T19:52:00+08:00'),
      },
    )
    expect(next).toEqual({
      version: 2,
      assessmentWeightBp: 6000,
      performanceWeightBp: 4000,
      recentStandardMatchThreshold: 12,
      effectiveAt: '2026-10-29T19:52:00+08:00',
      createdByEmail: 'owner@rotra.example',
    })
    expect(rankingPolicyVersion1).toEqual(before)
  })

  it('formats any instant with the Manila offset', () => {
    expect(manilaIsoString(Date.parse('2026-01-05T01:00:00Z'))).toBe('2026-01-05T09:00:00+08:00')
    expect(manilaIsoString(Date.parse('2026-12-31T20:30:00Z'))).toBe('2027-01-01T04:30:00+08:00')
  })
})

describe('diffRows', () => {
  it('lists every setting in percentages and matches', () => {
    expect(diffRows(rankingPolicyVersion1, draft(6000, 4000, 10))).toEqual([
      { label: 'Club assessment', from: 70, to: 60, unit: '%' },
      { label: 'Match performance', from: 30, to: 40, unit: '%' },
      { label: 'Leaderboard requirement', from: 10, to: 10, unit: ' matches' },
    ])
  })
})
