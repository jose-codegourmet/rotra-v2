import { describe, expect, it } from 'vitest'
import { matchCategory, matchLabel, matchLabelOf } from './matchCategory.rules'

const M = 'male' as const,
  F = 'female' as const

describe('matchCategory', () => {
  it('calls an all men match Men\'s and an all women match Women\'s, in any format', () => {
    expect(matchCategory({ teamA: [M, M], teamB: [M, M] })).toBe("Men's")
    expect(matchCategory({ teamA: [M], teamB: [M] })).toBe("Men's")
    expect(matchCategory({ teamA: [F, F], teamB: [F, F] })).toBe("Women's")
    expect(matchCategory({ teamA: [F], teamB: [F] })).toBe("Women's")
    expect(matchCategory({ teamA: [F, F, F], teamB: [F, F, F] })).toBe("Women's")
  })
  it('calls both sides with the same mix Mixed', () => {
    expect(matchCategory({ teamA: [M, F], teamB: [F, M] })).toBe('Mixed')
    expect(matchCategory({ teamA: [M, M, F], teamB: [F, M, M] })).toBe('Mixed')
  })
  it('calls anything else Genderless', () => {
    expect(matchCategory({ teamA: [M, F], teamB: [M, M] })).toBe('Genderless')
    expect(matchCategory({ teamA: [M, M], teamB: [F, F] })).toBe('Genderless')
    expect(matchCategory({ teamA: [M], teamB: [F] })).toBe('Genderless')
    expect(matchCategory({ teamA: [M, M, F], teamB: [M, F, F] })).toBe('Genderless')
  })
  it('calls a match with a player without a gender Genderless', () => {
    expect(matchCategory({ teamA: [M, null], teamB: [M, M] })).toBe('Genderless')
    expect(matchCategory({ teamA: [F, F], teamB: [F, undefined] })).toBe('Genderless')
    expect(matchCategory({ teamA: [], teamB: [] })).toBe('Genderless')
  })
})

describe('matchLabel', () => {
  it('joins the category and the format', () => {
    expect(matchLabelOf('doubles', 'Mixed')).toBe('Mixed Doubles')
    expect(matchLabelOf('doubles', "Men's")).toBe("Men's Doubles")
    expect(matchLabelOf('singles', "Women's")).toBe("Women's Singles")
    expect(matchLabelOf('fun_3v3', 'Genderless')).toBe('Genderless 3v3 fun')
  })
  it('reads genders from the roster', () => {
    const roster = [
      { id: 'a', gender: M },
      { id: 'b', gender: F },
      { id: 'c', gender: F },
      { id: 'd', gender: M },
      { id: 'e' },
    ]
    expect(matchLabel({ format: 'doubles', teamA: ['a', 'b'], teamB: ['c', 'd'] }, roster)).toBe(
      'Mixed Doubles',
    )
    expect(matchLabel({ format: 'singles', teamA: ['a'], teamB: ['e'] }, roster)).toBe(
      'Genderless Singles',
    )
  })
})
