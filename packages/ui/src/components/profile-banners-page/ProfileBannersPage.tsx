'use client'

import { CharacterGrid } from '@rotra/ui/character-grid'
import { ImageDropZone } from '@rotra/ui/image-drop-zone'
import { PageHeader } from '@rotra/ui/page-header'
import { ProfileBanner } from '@rotra/ui/profile-banner'
import { UploadProgress } from '@rotra/ui/upload-progress'

/** At least this many banners stay shown, so players have a choice. */
export const PROFILE_BANNER_MIN_SHOWN = 2

/** Toast when hiding would leave fewer than the minimum shown. */
export const PROFILE_BANNER_HIDE_REFUSAL = `Keep at least ${PROFILE_BANNER_MIN_SHOWN} banners shown, so players have a choice.`
/** Toast when deleting would leave fewer than the minimum shown. */
export const PROFILE_BANNER_DELETE_REFUSAL = `Keep at least ${PROFILE_BANNER_MIN_SHOWN} banners shown. Upload or show another one first.`

/** “1 banner added and shown to players.” / “3 banners added and shown to players.” */
export function profileBannersAddedToast(count: number) {
  return `${count} ${count === 1 ? 'banner' : 'banners'} added and shown to players.`
}

/** “Dusk deleted.” (shown with Undo) */
export function profileBannerDeletedToast(name: string) {
  return `${name} deleted.`
}

export type ProfileBannerTile = {
  id: string
  /** The banner's name (seeded: Court, Night, …; uploads: “Banner N”) */
  name: string
  /** false = hidden from players (dimmed) */
  shown: boolean
  /** An uploaded 5:2 image */
  imageUrl?: string | null
  /** A seeded banner drawn from theme tokens (court, night, dusk, ember, sun, stripe) */
  bannerKey?: string | null
}

export type ProfileBannersPageProps = {
  /** In upload order; the page never reorders */
  banners: ProfileBannerTile[]
  /** Dropped or chosen files, unchecked: type, size and the 5:2 crop belong to the container */
  onFiles: (files: File[]) => void
  /** Click a tile: the container hides or shows it, or refuses below the minimum */
  onToggle: (id: string) => void
  /** × on a tile: the container deletes it with an Undo toast, or refuses below the minimum */
  onDelete: (id: string) => void
  /** While a batch is added: files handled so far and in the batch */
  upload?: { done: number; total: number } | null
  /** Offline: nothing can be added, hidden, shown or deleted */
  disabled?: boolean
}

/**
 * A-BANNERS (Admin › Settings › Profile banners), built like Profile characters: the header and
 * helper line with the shown and hidden counts, the drop zone, the upload progress, then the 5:2
 * banner tiles with their names. Toasts, the minimum rule and the save belong to the container.
 */
export function ProfileBannersPage({
  banners,
  onFiles,
  onToggle,
  onDelete,
  upload,
  disabled,
}: ProfileBannersPageProps) {
  const shown = banners.filter((banner) => banner.shown).length
  const hidden = banners.length - shown
  return (
    <>
      <PageHeader
        title="Profile banners"
        description={`The strip across the top of a player's profile card, like a Discord banner. Players pick one of the shown banners from Edit profile; they can't upload their own. Click a banner to hide or show it. ${shown} shown${hidden ? ` · ${hidden} hidden` : ''}.`}
      />
      <ImageDropZone
        id="banner-file"
        onFiles={onFiles}
        disabled={disabled}
        title="Drag banners here to upload"
        hint="or click to choose · PNG, JPG or WebP, up to 2 MB each · cropped to 5:2"
      />
      {upload ? <UploadProgress done={upload.done} total={upload.total} /> : null}
      <CharacterGrid
        variant="banner"
        aria-label="Banner images"
        disabled={disabled}
        onToggle={onToggle}
        onDelete={onDelete}
        items={banners.map((banner) => ({
          id: banner.id,
          shown: banner.shown,
          label: banner.name,
          caption: banner.name,
          src: banner.imageUrl ?? undefined,
          art: <ProfileBanner bannerKey={banner.bannerKey} className="size-full" />,
        }))}
      />
    </>
  )
}
