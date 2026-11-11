import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { setMockLatencyEnabled } from '../mock/latency'
import { mockStore, readMockState } from '../mock/store'
import {
  deleteProfileBanner,
  getShownProfileBanners,
  resolveMockProfileBanner,
  restoreProfileBanner,
  setProfileBannerShown,
} from './fetchers'
import { PROFILE_BANNER_DELETE_REFUSAL, PROFILE_BANNER_HIDE_REFUSAL } from './profileBanner.rules'

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
    await expect(deleteProfileBanner('court')).rejects.toThrow(PROFILE_BANNER_DELETE_REFUSAL)
    expect(
      readMockState()
        .profileBanners.filter((b) => b.shown)
        .map((b) => b.id),
    ).toEqual(['court', 'night'])
    // A hidden banner can always be deleted.
    await deleteProfileBanner('sun')
    expect(readMockState().profileBanners.some((b) => b.id === 'sun')).toBe(false)
  })

  it('defaults to the first shown banner once Court is deleted, and back to Court on Undo', async () => {
    expect(resolveMockProfileBanner(null).bannerKey).toBe('court')
    const deleted = await deleteProfileBanner('court')
    expect(resolveMockProfileBanner(null).bannerKey).toBe('night')
    // A player who chose Court keeps it after the delete.
    expect(resolveMockProfileBanner('court').bannerKey).toBe('court')
    await restoreProfileBanner(deleted)
    expect(resolveMockProfileBanner(null).bannerKey).toBe('court')
  })
})
