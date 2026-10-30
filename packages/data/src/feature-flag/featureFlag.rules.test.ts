import { describe, expect, it } from 'vitest'
import { placeholderFeatureFlag } from '../fixtures/featureFlags'
import {
  addFeatureFlagErrors,
  FEATURE_FLAG_KEY_TAKEN,
  FEATURE_FLAG_NAME_TAKEN,
  featureFlagAddedSummary,
  featureFlagSwitchedSummary,
  newFeatureFlag,
  switchedFeatureFlag,
  trimFeatureFlagInput,
  withPlaceholderFlag,
} from './featureFlag.rules'
import type { AddFeatureFlagInput, FeatureFlag } from './featureFlag.types'

const input = (overrides: Partial<AddFeatureFlagInput> = {}): AddFeatureFlagInput => ({
  name: 'Session cost estimate',
  key: 'session_cost_estimate',
  description: 'Shows the estimated cost per player before the session starts.',
  on: false,
  ...overrides,
})
const by = { email: 'owner@rotra.example', at: '2026-10-29T19:52:00+08:00' }
const existing: FeatureFlag = newFeatureFlag(input(), by)

describe('addFeatureFlagErrors', () => {
  it('accepts a complete, unique flag', () => {
    expect(addFeatureFlagErrors(input(), [])).toEqual({})
    expect(addFeatureFlagErrors(input({ name: 'Other', key: 'other_flag' }), [existing])).toEqual(
      {},
    )
  })

  it('requires a name of up to 50 characters', () => {
    expect(addFeatureFlagErrors(input({ name: '' }), []).name).toBe('Enter a name.')
    expect(addFeatureFlagErrors(input({ name: 'a'.repeat(50) }), []).name).toBeUndefined()
    expect(addFeatureFlagErrors(input({ name: 'a'.repeat(51) }), []).name).toBe(
      'Keep the name under 50 characters.',
    )
  })

  it('refuses a taken name ignoring case and accents', () => {
    const errors = addFeatureFlagErrors(
      input({ name: 'SÉSSION cost Estimate', key: 'other_flag' }),
      [existing],
    )
    expect(errors).toEqual({ name: FEATURE_FLAG_NAME_TAKEN })
  })

  it.each([
    'ab',
    '1abc',
    '_abc',
    'Abc',
    'has-dash',
    'has space',
    `a${'b'.repeat(40)}`,
  ])('refuses the key %j', (key) => {
    expect(addFeatureFlagErrors(input({ key }), []).key).toBe(
      'Use 3 to 40 lowercase letters, numbers and underscores, starting with a letter.',
    )
  })

  it.each(['abc', 'a_1', `a${'b'.repeat(39)}`])('accepts the key %j', (key) => {
    expect(addFeatureFlagErrors(input({ key }), []).key).toBeUndefined()
  })

  it('requires a key and refuses a taken one', () => {
    expect(addFeatureFlagErrors(input({ key: '' }), []).key).toBe('Enter a key.')
    expect(addFeatureFlagErrors(input({ name: 'Other' }), [existing])).toEqual({
      key: FEATURE_FLAG_KEY_TAKEN,
    })
  })

  it('asks for a description of at least 10 characters', () => {
    expect(addFeatureFlagErrors(input({ description: 'Too short' }), []).description).toBe(
      'Describe what the flag does, so it is clear when to use it.',
    )
    expect(addFeatureFlagErrors(input({ description: 'Long enough' }), [])).toEqual({})
  })
})

describe('trimFeatureFlagInput', () => {
  it('trims the text fields and keeps the value', () => {
    expect(
      trimFeatureFlagInput(input({ name: '  Name ', key: ' key_one ', description: ' Does. ' })),
    ).toEqual({ name: 'Name', key: 'key_one', description: 'Does.', on: false })
  })
})

describe('newFeatureFlag', () => {
  it('starts at revision 1 and counts adding as the first change', () => {
    expect(newFeatureFlag(input({ on: true }), by)).toEqual({
      ...input({ on: true }),
      revision: 1,
      createdAt: by.at,
      createdByEmail: by.email,
      changedAt: by.at,
      changedByEmail: by.email,
    })
  })
})

describe('switchedFeatureFlag', () => {
  it('saves the value with the next revision and this change, and never changes the key', () => {
    const later = { email: 'other@rotra.example', at: '2026-10-30T08:00:00+08:00' }
    const switched = switchedFeatureFlag(existing, true, later)
    expect(switched).toEqual({
      ...existing,
      on: true,
      revision: 2,
      changedAt: later.at,
      changedByEmail: later.email,
    })
    expect(switched.key).toBe(existing.key)
    expect(switched.createdAt).toBe(existing.createdAt)
  })
})

describe('audit summaries', () => {
  it('match the prototype log lines', () => {
    expect(featureFlagAddedSummary({ key: 'abc', on: false })).toBe('Added feature flag abc (off).')
    expect(featureFlagAddedSummary({ key: 'abc', on: true })).toBe('Added feature flag abc (on).')
    expect(featureFlagSwitchedSummary({ key: 'abc', on: true })).toBe('Turned on feature flag abc.')
    expect(featureFlagSwitchedSummary({ key: 'abc', on: false })).toBe(
      'Turned off feature flag abc.',
    )
  })
})

describe('withPlaceholderFlag', () => {
  it('adds the placeholder at the top and removes it again', () => {
    const shown = withPlaceholderFlag([existing], placeholderFeatureFlag, true)
    expect(shown.map((flag) => flag.key)).toEqual(['placeholder', 'session_cost_estimate'])
    expect(withPlaceholderFlag(shown, placeholderFeatureFlag, true)).toHaveLength(2)
    expect(withPlaceholderFlag(shown, placeholderFeatureFlag, false)).toEqual([existing])
  })
})

describe('the catalog', () => {
  it('starts empty, without the placeholder', async () => {
    const { featureFlags } = await import('../fixtures/featureFlags')
    expect(featureFlags).toEqual([])
  })
})
