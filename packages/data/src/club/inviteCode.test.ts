import { describe, expect, it } from 'vitest'
import { clubInviteUrl } from '../club-player/registrationUrl'
import {
  CLUB_INVITE_ALPHABET,
  MOCK_INVITE_CODE_LENGTH,
  newClubInviteCode,
  REAL_INVITE_CODE_LENGTH,
  readClubInviteCode,
} from './inviteCode'

const CLUB = '5f0c6a8e-2d1b-4c3a-9e7f-1a2b3c4d5e6f'

describe('club invite code (#712)', () => {
  it('makes codes from the alphabet that fit clubs.invite_code', () => {
    for (let i = 0; i < 200; i++) {
      const code = newClubInviteCode()
      expect(code).toHaveLength(REAL_INVITE_CODE_LENGTH)
      expect(code).toMatch(/^[A-Z0-9]{8,16}$/)
      for (const char of code) expect(CLUB_INVITE_ALPHABET).toContain(char)
    }
    expect(newClubInviteCode(MOCK_INVITE_CODE_LENGTH)).toHaveLength(8)
    expect(newClubInviteCode(12)).toHaveLength(12)
  })

  it('never returns the code it replaces and refuses lengths outside 8–12', () => {
    const old = newClubInviteCode()
    for (let i = 0; i < 50; i++) expect(newClubInviteCode(undefined, old)).not.toBe(old)
    expect(() => newClubInviteCode(7)).toThrow(RangeError)
    expect(() => newClubInviteCode(13)).toThrow(RangeError)
  })

  it('reads a link k as a stored code, or null', () => {
    expect(readClubInviteCode(' rotra2xk9 ')).toBe('ROTRA2XK9')
    expect(readClubInviteCode('ABC')).toBeNull()
    expect(readClubInviteCode('ABCD-EFGH')).toBeNull()
    expect(readClubInviteCode('')).toBeNull()
    expect(readClubInviteCode(undefined)).toBeNull()
    expect(readClubInviteCode(['ABCDEFGH'])).toBeNull()
  })

  it('prints ?k=<code> on the club invite link, and never an empty ?k=', () => {
    expect(clubInviteUrl(CLUB, 'ROTRA2XK9')).toBe(
      `https://player.rotra.club/register/${CLUB}?k=ROTRA2XK9`,
    )
    expect(clubInviteUrl(CLUB, null)).toBe(`https://player.rotra.club/register/${CLUB}`)
    expect(clubInviteUrl(CLUB, '')).not.toContain('?k=')
  })
})
