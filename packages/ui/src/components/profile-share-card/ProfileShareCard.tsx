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
  /** Counted wins this calendar year; null shows "No games yet this year". */
  wins: number | null
  /** The calendar year the wins count (“In YEAR”); defaults to the current year */
  year?: number
  onCopy: () => void
}

/**
 * P-OWN-PROFILE's Share profile: the Story, Facebook post and Square images (picture, level, overall
 * position, wins this calendar year “In YEAR”; no QR), picked and downloaded or shared, then OR and the Profile link.
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
  year = new Date().getFullYear(),
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
                'flex min-h-0 flex-1 flex-col text-left',
                format === 'square' ? 'justify-start gap-2' : 'justify-center',
                format === 'post' && 'gap-3',
                format === 'story' && 'gap-3.5',
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
              {levelLabel === null && position === null ? null : (
                <div className="flex flex-col gap-0.5">
                  <span
                    data-qr-text
                    className="text-[11px] font-semibold tracking-[0.5px] text-share-muted uppercase"
                  >
                    Overall
                  </span>
                  {position ? (
                    <b
                      data-qr-text
                      className={cn(
                        'font-mono leading-none font-bold text-share-accent',
                        format === 'square' ? 'text-[36px]' : 'text-[52px]',
                      )}
                    >
                      #{position.toLocaleString('en-PH')}
                    </b>
                  ) : (
                    <b data-qr-text className="text-xl text-share-fg">
                      No position
                    </b>
                  )}
                </div>
              )}
              {wins === null ? (
                <b
                  data-qr-text
                  className={cn(
                    'text-share-fg',
                    format === 'square' ? 'text-[15px]' : 'text-[18px]',
                  )}
                >
                  No games yet this year
                </b>
              ) : (
                <div className="flex flex-col gap-2">
                  <span
                    data-qr-text
                    className="text-[11px] font-semibold tracking-[0.5px] text-share-muted uppercase"
                  >
                    In {year}
                  </span>
                  <div
                    className={cn(
                      'grid gap-2',
                      format === 'story'
                        ? 'grid-cols-2 gap-y-3.5'
                        : 'auto-cols-[minmax(0,1fr)] grid-flow-col',
                    )}
                  >
                    <div className="flex min-w-0 flex-col gap-0.5">
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
                          format === 'square' ? 'text-[10px]' : 'text-[12px]',
                        )}
                      >
                        Wins
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ShareImage>
        ),
      }))}
    />
  )
}
