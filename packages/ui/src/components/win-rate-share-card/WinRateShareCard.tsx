'use client'

import { cn } from '@rotra/ui/cn'
import { SHARE_FORMATS } from '@rotra/ui/share-card/helpers'
import { ShareImage } from '@rotra/ui/share-image'
import { ShareImagePicker, type ShareImagePickerItem } from '@rotra/ui/share-image-picker'

export type WinRateShareCardProps = {
  /** The Profile link under OR (the player's ROTRA profile) */
  link: string
  /** Display name: nickname when there is one, else the name */
  name: string
  rtrId: string | null
  picture?: string | null
  /** Stats · YEAR */
  year: number
  /** This year's counted games; null shows “No games yet” */
  stats: { games: number; wins: number; losses: number; winRate: number } | null
  onCopy: () => void
  webShare?: boolean
  onDownloaded?: (item: ShareImagePickerItem) => void
  onShared?: () => void
  onError?: (message: string) => void
}

/**
 * Queue's Share profile from the participant profile card (2026-11-13-profile-card-open-share;
 * the prototype's SHEETS.shareFinish kind profile): Story, Facebook post and Square with the
 * picture, display name and RTR ID, “Win rate · YEAR” big with games, W and L; then OR and the
 * Profile link. Put it in ShareDialog titled “Share profile”.
 */
export function WinRateShareCard({
  link,
  name,
  rtrId,
  picture,
  year,
  stats,
  onCopy,
  webShare,
  onDownloaded,
  onShared,
  onError,
}: WinRateShareCardProps) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
  const items: ShareImagePickerItem[] = SHARE_FORMATS.map(({ format, label, hint }) => ({
    id: format,
    label,
    hint,
    format,
    fileName: `rotra-profile-${format}`,
    image: (
      <ShareImage
        glow="bottom"
        format={format}
        headline={name}
        subline={rtrId ?? 'ROTRA player'}
        spot={{ initials, imageUrl: picture }}
      >
        <div className="flex flex-1 flex-col justify-center gap-2">
          <span
            data-qr-text
            className="text-[11px] font-bold tracking-[0.6px] text-share-muted uppercase"
          >
            Win rate · {year}
          </span>
          {stats ? (
            <>
              <b
                data-qr-text
                className={cn(
                  'font-mono leading-none font-bold text-share-accent',
                  format === 'square' ? 'text-[44px]' : 'text-[56px]',
                )}
              >
                {Math.round(stats.winRate)}%
              </b>
              <div className="flex gap-3.5 text-[12px] text-share-muted">
                <span data-qr-text>
                  <b className="text-[16px] text-share-fg">{stats.games}</b> games
                </span>
                <span data-qr-text>
                  <b className="text-[16px] text-share-fg">{stats.wins}</b> W
                </span>
                <span data-qr-text>
                  <b className="text-[16px] text-share-fg">{stats.losses}</b> L
                </span>
              </div>
            </>
          ) : (
            <b data-qr-text className="text-[28px] leading-[1.1] font-extrabold text-share-fg">
              No games yet
            </b>
          )}
        </div>
      </ShareImage>
    ),
  }))
  return (
    <ShareImagePicker
      items={items}
      shareTitle={`${name} on ROTRA`}
      images={{ spot: picture }}
      link={link}
      linkLabel="Profile link"
      copyLabel="Copy profile link"
      onCopy={onCopy}
      webShare={webShare}
      onDownloaded={onDownloaded}
      onShared={onShared}
      onError={onError}
    />
  )
}
