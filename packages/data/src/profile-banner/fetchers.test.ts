import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { setMockLatencyEnabled } from '../mock/latency'
import { mockStore, readMockState } from '../mock/store'
import {
  deleteProfileBanner,
  getShownProfileBanners,
  resolveMockProfileBanner,
  restoreProfileBanner,
  setDefaultProfileBanner,
  setProfileBannerShown,
} from './fetchers'
import {
  PROFILE_BANNER_DEFAULT_REFUSAL,
  PROFILE_BANNER_DELETE_REFUSAL,
  PROFILE_BANNER_HIDE_REFUSAL,
} from './profileBanner.rules'

describe('Profile banners › mock mode', () => {
  let restoreLatency: () => void
  beforeEach(() => {
    mockStore.reset()
    restoreLatency = setMockLatencyEnabled(false)
  })
  afterEach(() => restoreLatency())

  it('seeds the six banners, all shown, Court first', async () => {
    expect((await getShownProfileBanners()).map((b) => b.id)).toEqual([
      'court',
      'night',
      'dusk',
      'ember',
      'sun',
      'stripe',
    ])
  })

  it('refuses hiding or deleting below 2 shown and changes nothing', async () => {
    for (const id of ['dusk', 'ember', 'sun', 'stripe'])
      await setProfileBannerShown({ id, shown: false })
    await expect(setProfileBannerShown({ id: 'night', shown: false })).rejects.toThrow(
      PROFILE_BANNER_HIDE_REFUSAL,
    )
    await expect(deleteProfileBanner('night')).rejects.toThrow(PROFILE_BANNER_DELETE_REFUSAL)
    expect(
      readMockState()
        .profileBanners.filter((b) => b.shown)
        .map((b) => b.id),
    ).toEqual(['court', 'night'])
    // A hidden banner can always be deleted.
    await deleteProfileBanner('sun')
    expect(readMockState().profileBanners.some((b) => b.id === 'sun')).toBe(false)
  })

  it('refuses hiding or deleting the default banner', async () => {
    await expect(setProfileBannerShown({ id: 'court', shown: false })).rejects.toThrow(
      PROFILE_BANNER_DEFAULT_REFUSAL,
    )
    await expect(deleteProfileBanner('court')).rejects.toThrow(PROFILE_BANNER_DEFAULT_REFUSAL)
  })

  it('draws the banner Admin made default, and Court again after Undo', async () => {
    expect(resolveMockProfileBanner(null).bannerKey).toBe('court')
    const { previousId } = await setDefaultProfileBanner('dusk')
    expect(previousId).toBe('court')
    expect(resolveMockProfileBanner(null).bannerKey).toBe('dusk')
    // The old default can now be deleted; a player who chose Court keeps it.
    const deleted = await deleteProfileBanner('court')
    expect(resolveMockProfileBanner('court').bannerKey).toBe('court')
    await restoreProfileBanner(deleted)
    await setDefaultProfileBanner(previousId)
    expect(resolveMockProfileBanner(null).bannerKey).toBe('court')
  })
})
