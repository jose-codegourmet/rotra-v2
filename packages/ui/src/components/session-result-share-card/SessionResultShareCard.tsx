'use client'
import { cn } from '@rotra/ui/cn'
import type { ShareCardProps } from '@rotra/ui/share-card'
import { SHARE_FORMATS } from '@rotra/ui/share-card/helpers'
import { ShareImage } from '@rotra/ui/share-image'
import { ShareImagePicker } from '@rotra/ui/share-image-picker'
export type PlayerSessionShareProps = Pick<
  ShareCardProps,
  'initialFormat' | 'webShare' | 'onShared' | 'onDownloaded' | 'onError'
> & {
  link: string
  name: string
  nickname?: string | null
  picture?: string | null
  title: string
  dateLabel: string
  clubName: string
  wins: number
  losses: number
  onCopy: () => void
}
export type SessionResultShareCardProps = PlayerSessionShareProps & {
  position: number | null
  games: number
}
/**
 * Share result: the Story, Facebook post and Square images of one published session (standings
 * position, games, W–L; no QR), then OR and the Link. `initialFormat` is kept and ignored.
 */
export function SessionResultShareCard({
  link,
  name,
  nickname,
  picture,
  title,
  dateLabel,
  clubName,
  wins,
  losses,
  position,
  games,
  onCopy,
  webShare,
  onShared,
  onDownloaded,
  onError,
}: SessionResultShareCardProps) {
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
  return (
    <ShareImagePicker
      shareTitle="Share result"
      pickHint="Tap an image to pick it."
      images={{ spot: picture }}
      link={link}
      linkLabel="Link"
      copyLabel="Copy link"
      onCopy={onCopy}
      webShare={webShare}
      onShared={onShared}
      onError={onError}
      onDownloaded={(item) => onDownloaded?.(item.format)}
      items={SHARE_FORMATS.map(({ format, label, hint }) => ({
        id: format,
        label,
        hint,
        format,
        fileName: `rotra-result-${format}`,
        image: (
          <ShareImage
            format={format}
            headline={name}
            subline={nickname ? `“${nickname}”` : undefined}
            spot={{ initials, imageUrl: picture }}
          >
            <div
              className={cn(
                'flex flex-1 flex-col justify-center text-left',
                format === 'square' ? 'gap-2' : 'gap-3',
              )}
            >
              <h3
                data-qr-text
                className={cn(
                  'text-[22px] font-extrabold text-share-fg',
                  format === 'square' && 'truncate',
                )}
              >
                {title}
              </h3>
              <p data-qr-text className="text-[13px] text-share-muted">
                {dateLabel} · {clubName}
              </p>
              <div className="flex items-baseline gap-2">
                <b data-qr-text className="font-mono text-[40px] leading-none text-share-accent">
                  {position ? `#${position}` : 'No position'}
                </b>
                <span data-qr-text className="text-sm text-share-muted">
                  in Standings
                </span>
              </div>
              <b data-qr-text className="text-[15px] text-share-fg">
                {games} {games === 1 ? 'game' : 'games'} · {wins}–{losses}
              </b>
            </div>
          </ShareImage>
        ),
      }))}
    />
  )
}
