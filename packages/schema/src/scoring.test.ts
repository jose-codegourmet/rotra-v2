import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SCORING,
  ENDING_SOON_PHASES,
  expectedFinish,
  gameScoreError,
  gameScoreValid,
  gamesWon,
  losingScoreMax,
  SCORING,
  SCORING_KEYS,
  scoringMode,
  scoringOf,
  typedScoreError,
  validateResult,
} from './scoring'

describe('scoring table', () => {
  it('lists the five modes in setup order with the 16/31 default', () => {
    expect(SCORING_KEYS.map((k) => SCORING[k].label)).toEqual([
      '16/31',
      '16/31, no deuce',
      '11/21',
      '11/21 × 3',
      '21 × 3',
    ])
    expect(DEFAULT_SCORING).toBe('31')
    expect(SCORING['21x3nd']).toMatchObject({ target: 21, games: 3, deuce: false })
  })

  it('reads a missing or unknown value as 16/31', () => {
    expect(scoringOf(undefined)).toBe('31')
    expect(scoringOf(null)).toBe('31')
    expect(scoringOf('toString')).toBe('31')
    expect(scoringOf('21x3')).toBe('21x3')
    expect(scoringMode(undefined).label).toBe('16/31')
  })

  it('caps the single losing-score box per mode', () => {
    expect(SCORING_KEYS.map((k) => losingScoreMax(SCORING[k]))).toEqual([29, 30, 19, 19, 20])
  })
})

describe('gameScoreValid', () => {
  const deuce31 = SCORING['31'],
    plain31 = SCORING['31nd'],
    deuce21 = SCORING['21']

  it('needs exactly the target without deuce', () => {
    expect(gameScoreValid(plain31, 31, 30)).toBe(true)
    expect(gameScoreValid(plain31, 31, 31)).toBe(false)
    expect(gameScoreValid(plain31, 32, 30)).toBe(false)
  })

  it('plays deuce with a 2-point lead and no cap', () => {
    expect(gameScoreValid(deuce31, 31, 29)).toBe(true)
    expect(gameScoreValid(deuce31, 31, 30)).toBe(false)
    expect(gameScoreValid(deuce31, 32, 30)).toBe(true)
    expect(gameScoreValid(deuce31, 50, 48)).toBe(true)
    expect(gameScoreValid(deuce31, 33, 30)).toBe(false)
    expect(gameScoreValid(deuce21, 22, 20)).toBe(true)
    expect(gameScoreValid(deuce21, 21, 21.5)).toBe(false)
  })
})

describe('gameScoreError with the dialog entry', () => {
  const mode = SCORING['31']

  it('reads typed deuce boxes as a deuce game first', () => {
    expect(gameScoreError(mode, { winner: 'A', a: 31, b: 30, deuceEntry: true })).toBe(
      'A deuce game ends when one pair leads by 2, like 32–30.',
    )
    expect(gameScoreError(mode, { winner: 'A', a: 30, b: 33, deuceEntry: true })).toBe(
      'A deuce game ends when one pair leads by 2, like 32–30.',
    )
    expect(gameScoreError(mode, { winner: 'A', a: 30, b: 32, deuceEntry: true })).toBe(
      'The score says Team B won, but Team A is picked. Fix one of them.',
    )
    expect(gameScoreError(mode, { winner: 'B', a: 30, b: 32, deuceEntry: true })).toBeNull()
  })

  it('points the single box at the deuce switch at 30', () => {
    expect(gameScoreError(mode, { winner: 'A', a: 31, b: 30, deuceEntry: false })).toBe(
      'At 30–30 the game goes to deuce. Turn on Went to deuce and type both scores.',
    )
    expect(
      gameScoreError(
        SCORING['21x3'],
        { winner: 'B', a: 20, b: 21, deuceEntry: false },
        { game: 1 },
      ),
    ).toBe(
      'Game 2: At 20–20 the game goes to deuce. Turn on Deuce for this game and type both scores.',
    )
    expect(gameScoreError(mode, { winner: 'A', a: 31, b: null, deuceEntry: false })).toBe(
      'Enter the losing score as a whole number from 0 to 29.',
    )
  })
})

describe('typedScoreError (two boxes, no deuce switch)', () => {
  it('takes the higher score as the winner and checks the mode', () => {
    expect(typedScoreError(SCORING['31'], 30, 32)).toBeNull()
    expect(typedScoreError(SCORING['31'], 31, 21)).toBeNull()
    expect(typedScoreError(SCORING['31'], 31, 30)).toBe(
      'At 30–30 the game goes to deuce: the winner needs a 2-point lead, like 32–30.',
    )
    expect(typedScoreError(SCORING['31'], 33, 30)).toBe(
      'Enter a finished game: 31 against 0 to 29, or past 30–30 a 2-point lead, like 32–30.',
    )
    expect(typedScoreError(SCORING['31nd'], 31, 30)).toBeNull()
    expect(typedScoreError(SCORING['31nd'], 32, 30)).toBe(
      'The winner has 31 and the other pair 0 to 30.',
    )
    expect(typedScoreError(SCORING['21x3'], 21, 21, { game: 2 })).toBe(
      "Game 3: A game can't end level. One pair needs 21.",
    )
  })
})

describe('validateResult', () => {
  it('keeps a winner-only result valid in every mode', () => {
    for (const scoring of SCORING_KEYS)
      expect(validateResult({ scoring, winner: 'B' })).toEqual({ winner: 'B', error: null })
  })

  it('takes the winner from the games when none is picked', () => {
    expect(
      validateResult({
        scoring: '21x3',
        games: [
          { a: 18, b: 21 },
          { a: 21, b: 23 },
        ],
      }),
    ).toEqual({ winner: 'B', error: null })
    expect(
      gamesWon([
        { a: 21, b: 18 },
        { a: 15, b: 21 },
        { a: 21, b: 19 },
      ]),
    ).toEqual({
      wins: { A: 2, B: 1 },
      decided: 'A',
    })
  })
})

describe('expectedFinish', () => {
  it('carries the typical and long minutes of every mode', () => {
    expect(SCORING_KEYS.map((k) => [SCORING[k].typical, SCORING[k].long])).toEqual([
      [15, 25],
      [15, 18],
      [10, 15],
      [25, 35],
      [25, 30],
    ])
  })

  it('changes phase at typical − 3, typical and long in every mode', () => {
    for (const key of SCORING_KEYS) {
      const { typical, long } = SCORING[key]
      const phases = [typical - 4, typical - 3, typical - 1, typical, long - 1, long].map(
        (p) => expectedFinish(key, p).phase,
      )
      expect(phases, key).toEqual(['mid', 'soon', 'soon', 'any', 'any', 'long'])
    }
  })

  it('words each phase like the Playing court card', () => {
    expect(expectedFinish('31', 4)).toEqual({
      phase: 'mid',
      minutesLeft: 11,
      text: 'Ends in about 11 min',
      tag: 'ends in about 11 min',
    })
    expect(expectedFinish('31', 13)).toMatchObject({ minutesLeft: 2, text: 'Finishing soon' })
    expect(expectedFinish('31', 20).text).toBe('Could end any time · may be in deuce')
    expect(expectedFinish('31nd', 16).text).toBe('Could end any time')
    expect(expectedFinish('21x3nd', 30)).toMatchObject({ minutesLeft: 0, text: 'Running long' })
  })

  it('counts the full typical length for a match that has not started', () => {
    expect(expectedFinish('21x3', null)).toEqual({
      phase: 'notStarted',
      minutesLeft: 25,
      text: 'Not started yet',
      tag: 'not started yet',
    })
    expect(expectedFinish(undefined, null).minutesLeft).toBe(15)
    expect(ENDING_SOON_PHASES).toEqual(['soon', 'any', 'long'])
  })
})
