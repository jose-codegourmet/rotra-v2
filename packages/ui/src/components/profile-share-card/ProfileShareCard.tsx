'use client'
import { cn } from '@rotra/ui/cn'
import type { ShareCardProps } from '@rotra/ui/share-card'
import { SHARE_FORMATS } from '@rotra/ui/share-card/helpers'
import { ShareImage } from '@rotra/ui/share-image'
import { ShareImagePicker } from '@rotra/ui/share-image-picker'

export type ProfileShareCardProps = Pick<
  ShareCardProps,
  'initialFormat' | 'webShare' | 'onShared' | 'onDownloaded' | 'onError'
> & {
  link: string
  name: string
  nickname?: string | null
  /** Photo, resolved character or null for initials. */
  picture?: string | null
  /** Null shows "Not ranked yet". */
  levelLabel: string | null
  /** The overall leaderboard position; hidden when there is none. */
  position: number | null
  /** Counted wins in the last 90 days; null shows "No games yet". */
  wins: number | null
  onCopy: () => void
}

/**
 * P-OWN-PROFILE's Share profile: the Story, Facebook post and Square images (picture, level, overall
 * position, last 90 days wins; no QR), picked and downloaded or shared, then OR and the Profile link.
 * `initialFormat` is kept for older callers and ignored: every size starts picked.
 */
export function ProfileShareCard({
  link,
  name,
  nickname,
  picture,
  levelLabel,
  position,
  wins,
  onCopy,
  webShare,
  onShared,
  onDownloaded,
  onError,
}: ProfileShareCardProps) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
  return (
    <ShareImagePicker
      shareTitle="Share profile"
      pickHint="Tap an image to pick it."
      images={{ spot: picture }}
      link={link}
      linkLabel="Profile link"
      copyLabel="Copy profile link"
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
        fileName: `rotra-profile-${format}`,
        image: (
          <ShareImage
            format={format}
            headline={name}
            subline={nickname ? `“${nickname}”` : 'ROTRA player'}
            spot={{ initials, imageUrl: picture }}
          >
            <div
              className={cn(
                'flex flex-1 flex-col justify-center text-left',
                format === 'square' ? 'gap-2.5' : 'gap-4',
              )}
            >
              <b
                data-qr-text
                className={cn(
                  'leading-[1.1] font-extrabold',
                  format === 'square' ? 'text-[22px]' : 'text-[28px]',
                  levelLabel ? 'text-share-accent' : 'text-share-fg',
                )}
              >
                {levelLabel ?? 'Not ranked yet'}
              </b>
              <div className={cn('flex gap-4', format === 'square' ? 'flex-row' : 'flex-col')}>
                {position ? (
                  <div className="flex flex-col gap-0.5">
                    <span
                      data-qr-text
                      className="text-[11px] font-semibold tracking-[0.5px] text-share-muted uppercase"
                    >
                      Overall
                    </span>
                    <b
                      data-qr-text
                      className={cn(
                        'font-mono leading-none font-bold text-share-accent',
                        format === 'square' ? 'text-[36px]' : 'text-[52px]',
                      )}
                    >
                      #{position.toLocaleString('en-PH')}
                    </b>
                  </div>
                ) : null}
                {wins === null ? (
                  <b
                    data-qr-text
                    className={cn('text-share-fg', format === 'square' ? 'text-[15px]' : 'text-lg')}
                  >
                    No games yet
                  </b>
                ) : (
                  <div className="flex flex-col gap-0.5">
                    <span
                      data-qr-text
                      className="text-[11px] font-semibold tracking-[0.5px] text-share-muted uppercase"
                    >
                      Last 90 days
                    </span>
                    <b
                      data-qr-text
                      className={cn(
                        'font-mono leading-[1.1] font-bold text-share-fg',
                        format === 'square' ? 'text-[20px]' : 'text-[28px]',
                      )}
                    >
                      {wins}
                    </b>
                    <span
                      data-qr-text
                      className={cn(
                        'text-share-muted',
                        format === 'square' ? 'text-[10px]' : 'text-xs',
                      )}
                    >
                      Wins
                    </span>
                  </div>
                )}
              </div>
            </div>
          </ShareImage>
        ),
      }))}
    />
  )
}
