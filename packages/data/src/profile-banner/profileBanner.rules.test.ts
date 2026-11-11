import { describe, expect, it } from 'vitest'
import { profileBanners } from '../fixtures/profileBanners'
import {
  PROFILE_CHARACTER_DELETE_REFUSAL,
  PROFILE_CHARACTER_HIDE_REFUSAL,
  PROFILE_CHARACTER_MIN_SHOWN,
  PROFILE_CHARACTER_PLAYER_PAGE,
} from '../profile-character/profileCharacter.rules'
import {
  PROFILE_BANNER_DELETE_REFUSAL,
  PROFILE_BANNER_HIDE_REFUSAL,
  PROFILE_BANNER_MIN_SHOWN,
  profileBannerBelowMinimum,
  profileBannerName,
  resolveProfileBanner,
} from './profileBanner.rules'
import type { ProfileBanner } from './profileBanner.types'

const library = (shown: string[]): ProfileBanner[] =>
  profileBanners.map((b) => ({ ...b, shown: shown.includes(b.id) }))
const finder = (list: readonly ProfileBanner[]) => (id: string) => list.find((b) => b.id === id)

describe('minimum shown banners', () => {
  it('keeps at least 2 shown, with the Admin log copy', () => {
    expect(PROFILE_BANNER_MIN_SHOWN).toBe(2)
    expect(PROFILE_BANNER_HIDE_REFUSAL).toBe(
      'Keep at least 2 banners shown, so players have a choice.',
    )
    expect(PROFILE_BANNER_DELETE_REFUSAL).toBe(
      'Keep at least 2 banners shown. Upload or show another one first.',
    )
  })

  it('refuses hiding or deleting a shown banner only at the minimum', () => {
    const three = library(['court', 'night', 'dusk'])
    const two = library(['court', 'night'])
    expect(profileBannerBelowMinimum(three[0] as ProfileBanner, three)).toBe(false)
    expect(profileBannerBelowMinimum(two[0] as ProfileBanner, two)).toBe(true)
  })

  it('always lets a hidden banner go', () => {
    const two = library(['court', 'night'])
    const hidden = two.find((b) => b.id === 'sun') as ProfileBanner
    expect(profileBannerBelowMinimum(hidden, two)).toBe(false)
  })
})

describe('default banner', () => {
  const shownOf = (list: ProfileBanner[]) => list.filter((b) => b.shown)

  it('is Court when nothing is chosen and Court is shown', () => {
    const all = library(['court', 'night', 'dusk'])
    expect(resolveProfileBanner(null, finder(all), shownOf(all))).toEqual({
      bannerKey: 'court',
      bannerImageUrl: null,
    })
  })

  it('is the first shown banner when Court is hidden', () => {
    const all = library(['dusk', 'ember'])
    expect(resolveProfileBanner(null, finder(all), shownOf(all)).bannerKey).toBe('dusk')
  })

  it('is the first shown banner when Court is deleted', () => {
    const all = library(['court', 'night', 'sun']).filter((b) => b.id !== 'court')
    expect(resolveProfileBanner(undefined, finder(all), shownOf(all)).bannerKey).toBe('night')
  })

  it('keeps a chosen banner even when it is hidden', () => {
    const all = library(['court', 'night'])
    expect(resolveProfileBanner('stripe', finder(all), shownOf(all)).bannerKey).toBe('stripe')
  })

  it('falls back to the default for an id the library does not know', () => {
    const all = library(['night', 'dusk'])
    expect(resolveProfileBanner('gone', finder(all), shownOf(all)).bannerKey).toBe('night')
  })

  it('carries an uploaded banner image', () => {
    const upload: ProfileBanner = {
      id: '0b4c7a1e-2f3d-4e5a-8b6c-7d8e9f0a1b2c',
      image: 'https://example.test/b.webp',
      shown: true,
      uploadedAt: 1,
      number: 7,
    }
    expect(resolveProfileBanner(upload.id, finder([upload]), [upload])).toEqual({
      bannerKey: upload.id,
      bannerImageUrl: 'https://example.test/b.webp',
    })
    expect(profileBannerName(upload)).toBe('Banner 7')
    expect(profileBannerName({ id: 'dusk', number: 3 })).toBe('Dusk')
  })
})

describe('profile characters', () => {
  it('shows 15 per page and keeps at least 15 shown', () => {
    expect(PROFILE_CHARACTER_PLAYER_PAGE).toBe(15)
    expect(PROFILE_CHARACTER_MIN_SHOWN).toBe(15)
    expect(PROFILE_CHARACTER_HIDE_REFUSAL).toBe(
      "Keep at least 15 images shown, so the players' first page is full.",
    )
    expect(PROFILE_CHARACTER_DELETE_REFUSAL).toBe(
      'Keep at least 15 images shown. Upload or show another one first.',
    )
  })
})
