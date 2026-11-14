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
                'flex min-h-0 flex-1 flex-col text-left',
                format === 'square' ? 'justify-start gap-2' : 'justify-center',
                format === 'post' && 'gap-3',
                format === 'story' && 'gap-3.5',
              )}
            >
              <b
                data-qr-text
                className={cn(
                  'leading-[1.1] font-extrabold text-share-accent',
                  format === 'square' ? 'text-[22px]' : 'text-[28px]',
                )}
              >
                {levelLabel}
              </b>
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
                    #{position}
                  </b>
                ) : (
                  <b data-qr-text className="text-xl text-share-fg">
                    No position
                  </b>
                )}
              </div>
              <SkillLadder level={level} shareCard />
            </div>
          </ShareImage>
        ),
      }))}
    />
  )
}
