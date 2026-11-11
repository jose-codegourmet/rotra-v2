import { describe, expect, it } from 'vitest'
import { isListedInDirectory, isNameMasked } from './visibility.rules'

describe('Profile visibility › name masking (D-2026-11-12-01)', () => {
  const visitor = { signedIn: false, isSelf: false }
  const player = { signedIn: true, isSelf: false }
  const self = { signedIn: true, isSelf: true }
  const queueMaster = { signedIn: false, isSelf: false, queueMaster: true }

  it('never masks a public profile', () => {
    expect(isNameMasked('public', visitor)).toBe(false)
    expect(isNameMasked('public', player)).toBe(false)
  })
  it('masks a private profile for visitors only', () => {
    expect(isNameMasked('private', visitor)).toBe(true)
    expect(isNameMasked('private', player)).toBe(false)
    expect(isNameMasked('private', self)).toBe(false)
  })
  it('masks an always-private profile for everyone but the player and their Queue Master', () => {
    expect(isNameMasked('always_private', visitor)).toBe(true)
    expect(isNameMasked('always_private', player)).toBe(true)
    expect(isNameMasked('always_private', self)).toBe(false)
    expect(isNameMasked('always_private', queueMaster)).toBe(false)
  })
})

describe('Hide me from Player Information', () => {
  it('lists a profile unless the switch is on, including profiles without the flag', () => {
    expect(isListedInDirectory(undefined)).toBe(true)
    expect(isListedInDirectory({})).toBe(true)
    expect(isListedInDirectory({ hiddenFromDirectory: false })).toBe(true)
    expect(isListedInDirectory({ hiddenFromDirectory: true })).toBe(false)
  })
})
