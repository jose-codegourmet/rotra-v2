import { describe, expect, it } from 'vitest'
import {
  RANKING_THRESHOLD_ERROR,
  RANKING_WEIGHT_ERROR,
  rankingSettingsErrors,
  rankingSettingsField,
  rankingWeightTotalError,
} from './ranking-settings'

const draft = (assessment: string, performance: string, threshold = '10') => ({
  assessment,
  performance,
  threshold,
})
const issues = (input: ReturnType<typeof draft>) => {
  const result = rankingSettingsField.safeParse(input)
  return result.success
    ? []
    : result.error.issues.map((issue) => [issue.path.join('.'), issue.message])
}

describe('ranking weights sum to 100', () => {
  it.each([
    ['70', '30'],
    ['100', '0'],
    ['0', '100'],
    ['50', '50'],
    [' 70 ', '30'],
  ])('accepts %s / %s', (assessment, performance) => {
    expect(rankingSettingsErrors(draft(assessment, performance))).toEqual({})
  })

  it('parses the agreed 70 / 30 and 10 matches to whole numbers', () => {
    expect(rankingSettingsField.parse(draft('70', '30'))).toEqual({
      assessmentPercent: 70,
      performancePercent: 30,
      recentStandardMatchThreshold: 10,
    })
  })

  it('rejects 70 / 40 on the total, without saving either weight separately', () => {
    expect(issues(draft('70', '40'))).toEqual([['total', rankingWeightTotalError(110)]])
    expect(rankingWeightTotalError(110)).toBe(
      'The two weights add up to 110%. They must total exactly 100%.',
    )
  })

  it.each([
    ['60', '30', 90],
    ['0', '0', 0],
    ['100', '100', 200],
  ])('rejects %s / %s as a %i%% total', (assessment, performance, total) => {
    expect(rankingSettingsErrors(draft(assessment, performance))).toEqual({
      total: rankingWeightTotalError(total),
    })
  })
})

describe('ranking weights are whole percentages', () => {
  it.each([
    '70.5',
    '69.9',
    '7e1',
    '-10',
    '101',
    '',
    ' ',
    'abc',
    '0x46',
  ])('rejects an assessment weight of "%s"', (assessment) => {
    expect(rankingSettingsErrors(draft(assessment, '30'))).toEqual({
      assessment: RANKING_WEIGHT_ERROR,
    })
  })

  it('checks the total only once both weights are valid', () => {
    expect(rankingSettingsErrors(draft('70.5', '29.5'))).toEqual({
      assessment: RANKING_WEIGHT_ERROR,
      performance: RANKING_WEIGHT_ERROR,
    })
  })
})

describe('leaderboard requirement', () => {
  it.each(['1', '10', '40'])('accepts %s matches', (threshold) => {
    expect(rankingSettingsErrors(draft('70', '30', threshold))).toEqual({})
  })

  it('says the 1 to 40 range', () => {
    expect(RANKING_THRESHOLD_ERROR).toBe('Use a whole number from 1 to 40.')
  })

  it.each(['0', '-1', '2.5', '', 'ten', '41', '100'])('rejects "%s"', (threshold) => {
    expect(issues(draft('70', '30', threshold))).toEqual([['threshold', RANKING_THRESHOLD_ERROR]])
  })
})
