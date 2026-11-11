import type { ProfileBanner } from '../profile-banner/profileBanner.types'
import { msOf, realRequest } from './client'

/** `@rotra/db/admin/profile-banners` ProfileBannerDto. */
type WireBanner = {
  id: string
  image: string
  shown: boolean
  uploadedAt: string
  number: number
}

const bannerOf = (wire: WireBanner): ProfileBanner => ({
  id: wire.id,
  image: wire.image,
  shown: wire.shown,
  uploadedAt: msOf(wire.uploadedAt),
  number: wire.number,
})

const path = (id: string) => `/api/profile-banners/${encodeURIComponent(id)}`

/** The Player picker: the public list of shown banners, in upload order. */
export async function realGetShownProfileBanners(signal?: AbortSignal) {
  const { banners } = await realRequest<{ banners: WireBanner[] }>('/api/profile-banners/shown', {
    signal,
  })
  return banners.map(bannerOf)
}

/** A-BANNERS: the whole library, hidden banners included (Admin only). */
export async function realListProfileBanners(signal?: AbortSignal) {
  const { banners } = await realRequest<{ banners: WireBanner[] }>('/api/profile-banners', {
    signal,
  })
  return banners.map(bannerOf)
}

/** Saves one cropped 3:1 image (a data URL) under a client UUID, so a retry returns the saved row. */
export async function realAddProfileBanner(image: string) {
  const { banner } = await realRequest<{ banner: WireBanner }>('/api/profile-banners', {
    method: 'POST',
    body: { id: crypto.randomUUID(), image },
  })
  return bannerOf(banner)
}

export async function realSetProfileBannerShown(input: { id: string; shown: boolean }) {
  const { banner } = await realRequest<{ banner: WireBanner }>(path(input.id), {
    method: 'PATCH',
    body: { shown: input.shown },
  })
  return bannerOf(banner)
}

export async function realDeleteProfileBanner(id: string) {
  const { banner } = await realRequest<{ banner: WireBanner }>(path(id), { method: 'DELETE' })
  return bannerOf(banner)
}

export async function realRestoreProfileBanner(id: string) {
  const { banner } = await realRequest<{ banner: WireBanner }>(`${path(id)}/restore`, {
    method: 'POST',
  })
  return bannerOf(banner)
}
