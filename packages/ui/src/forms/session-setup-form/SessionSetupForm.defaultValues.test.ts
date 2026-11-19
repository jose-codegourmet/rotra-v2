import { describe, expect, it } from 'vitest'
import { sessionSetupDefaultValues } from './SessionSetupForm.defaultValues'
import { sessionSetupSchema } from './SessionSetupForm.schema'

describe('sessionSetupDefaultValues', () => {
  it('starts Expected players at the slot budget, following it', () => {
    expect(sessionSetupDefaultValues(8)).toMatchObject({
      expectedPlayers: '16',
      expectedIsAuto: true,
    })
    expect(sessionSetupDefaultValues(10)).toMatchObject({
      expectedPlayers: '20',
      expectedIsAuto: true,
    })
  })

  it('scales with the club players per court instead of a fixed number', () => {
    expect(sessionSetupDefaultValues(5).expectedPlayers).toBe('10')
    expect(sessionSetupDefaultValues(4).expectedPlayers).toBe('8')
  })

  it('parses the defaults once a title and venue are set', () => {
    const parsed = sessionSetupSchema.safeParse({
      ...sessionSetupDefaultValues(8),
      title: 'Thursday Open Play',
      venue: { venueId: 'v1', name: 'Court', address: '' },
    })
    expect(parsed.success && parsed.data.expectedIsAuto).toBe(true)
  })

  it('records games by default, and a value that is missing reads as on', () => {
    expect(sessionSetupDefaultValues(8).recordGames).toBe(true)
    const { recordGames: _omitted, ...saved } = sessionSetupDefaultValues(8)
    const parsed = sessionSetupSchema.safeParse({
      ...saved,
      title: 'Thursday Open Play',
      venue: { venueId: 'v1', name: 'Court', address: '' },
    })
    expect(parsed.success && parsed.data.recordGames).toBe(true)
  })
})
