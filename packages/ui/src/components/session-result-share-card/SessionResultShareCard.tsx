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
                format === 'square' ? 'gap-2' : 'gap-3.5',
              )}
            >
              {/* Story and Facebook post fill the free space, set larger (share cards fill log). */}
              <h3
                data-qr-text
                className={cn(
                  'leading-[1.15] font-extrabold text-share-fg',
                  format === 'square' ? 'truncate text-[22px]' : 'text-[26px]',
                )}
              >
                {title}
              </h3>
              <p
                data-qr-text
                className={cn('text-share-muted', format === 'square' ? 'text-[13px]' : 'text-sm')}
              >
                {dateLabel} · {clubName}
              </p>
              <div className="flex items-baseline gap-2">
                <b
                  data-qr-text
                  className={cn(
                    'font-mono leading-none text-share-accent',
                    format === 'story'
                      ? 'text-[64px]'
                      : format === 'post'
                        ? 'text-[56px]'
                        : 'text-[40px]',
                  )}
                >
                  {position ? `#${position}` : 'No position'}
                </b>
                <span
                  data-qr-text
                  className={cn(
                    'text-share-muted',
                    format === 'square' ? 'text-sm' : 'text-[15px]',
                  )}
                >
                  in Standings
                </span>
              </div>
              <b
                data-qr-text
                className={cn('text-share-fg', format === 'square' ? 'text-[15px]' : 'text-lg')}
              >
                {games} {games === 1 ? 'game' : 'games'} · {wins}–{losses}
              </b>
            </div>
          </ShareImage>
        ),
      }))}
    />
  )
}
