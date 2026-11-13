'use client'
import { cn } from '@rotra/ui/cn'
import type { ShareCardProps } from '@rotra/ui/share-card'
import { SHARE_FORMATS } from '@rotra/ui/share-card/helpers'
import { ShareImage } from '@rotra/ui/share-image'
import { ShareImagePicker } from '@rotra/ui/share-image-picker'
import { SkillLadder } from '@rotra/ui/skill-ladder'
export type RankShareCardProps = Pick<
  ShareCardProps,
  'initialFormat' | 'webShare' | 'onShared' | 'onDownloaded' | 'onError'
> & {
  link: string
  name: string
  nickname?: string | null
  picture?: string | null
  level: number
  levelLabel: string
  position: number | null
  onCopy: () => void
}
/**
 * Share rank: the Story, Facebook post and Square images (level, overall position, skill ladder; no
 * QR), then OR and the Link. `initialFormat` is kept for older callers and ignored.
 */
export function RankShareCard({
  link,
  name,
  nickname,
  picture,
  level,
  levelLabel,
  position,
  onCopy,
  webShare,
  onShared,
  onDownloaded,
  onError,
}: RankShareCardProps) {
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
  return (
    <ShareImagePicker
      shareTitle="Share rank"
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
        fileName: `rotra-rank-${format}`,
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
                format === 'square' ? 'gap-3' : 'gap-5',
              )}
            >
              <div
                className={cn(
                  'flex items-start',
                  format === 'square' ? 'flex-row justify-between gap-3' : 'flex-col gap-4',
                )}
              >
                {/* Story and Facebook post are set larger (share cards fill log). */}
                <b
                  data-qr-text
                  className={cn(
                    'font-extrabold text-share-accent',
                    format === 'square' ? 'text-[22px]' : 'text-[28px]',
                  )}
                >
                  {levelLabel}
                </b>
                <div className="text-left">
                  <span data-qr-text className="text-xs text-share-muted">
                    Overall
                  </span>
                  <b
                    data-qr-text
                    className={
                      position
                        ? cn(
                            'block font-mono leading-none text-share-accent',
                            format === 'square' ? 'text-[36px]' : 'text-[52px]',
                          )
                        : 'block text-xl text-share-fg'
                    }
                  >
                    {position ? `#${position}` : 'No position'}
                  </b>
                </div>
              </div>
              <SkillLadder level={level} shareCard />
            </div>
          </ShareImage>
        ),
      }))}
    />
  )
}
