'use client'
import { cn } from '@rotra/ui/cn'
import type { PlayerSessionShareProps } from '@rotra/ui/session-result-share-card'
import { SHARE_FORMATS, type ShareFormat } from '@rotra/ui/share-card/helpers'
import { ShareImage } from '@rotra/ui/share-image'
import { ShareImagePicker } from '@rotra/ui/share-image-picker'

export type SessionPerformanceShareCardProps = PlayerSessionShareProps & {
  /** Every game played in the session, fun and partial included */
  games: number
  /** Standings position, only once the club has published; null hides Standing */
  position: number | null
}

/**
 * Share performance (2026-11-13 game row log, passes 6–7; share cards fill log): your night in one
 * card: the session title, date · club, your counted record big (“2–1”) with “67% won”, then
 * My session: Games, Won, Lost and Standing “#N” once published. `wins` and `losses` are counted
 * singles and doubles only. Available before the club publishes (D-2026-11-13-06).
 */
export function SessionPerformanceShareCard({
  link,
  name,
  nickname,
  picture,
  title,
  dateLabel,
  clubName,
  wins,
  losses,
  games,
  position,
  onCopy,
  webShare,
  onShared,
  onDownloaded,
  onError,
}: SessionPerformanceShareCardProps) {
  const counted = wins + losses
  const rate = counted ? Math.round((wins / counted) * 100) : 0
  const stats: [string, string][] = [
    ['Games', String(games)],
    ['Won', String(wins)],
    ['Lost', String(losses)],
    ...(position ? [['Standing', `#${position}`] as [string, string]] : []),
  ]
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
  const content = (format: ShareFormat) => {
    const tall = format !== 'square'
    return (
      <div
        className={cn(
          'flex min-h-0 flex-1 flex-col text-left',
          tall ? 'justify-center-safe' : 'justify-start gap-2',
          format === 'post' && 'gap-3',
          format === 'story' && 'gap-3.5',
        )}
      >
        <h3
          data-qr-text
          className={cn(
            'font-extrabold text-balance text-share-fg',
            tall ? 'text-[26px]' : 'text-[22px]',
            'leading-[1.15]',
          )}
        >
          {title}
        </h3>
        <p
          data-qr-text
          className={cn('text-share-muted', tall ? 'text-sm' : 'text-[13px]', 'leading-[1.4]')}
        >
          {dateLabel} · {clubName}
        </p>
        <div className="flex items-baseline gap-2">
          <b
            data-qr-text
            className={cn(
              'font-mono font-bold text-share-accent',
              format === 'story'
                ? 'text-[64px]'
                : format === 'post'
                  ? 'text-[56px]'
                  : 'text-[40px]',
              'leading-none',
            )}
          >
            {wins}–{losses}
          </b>
          <span
            data-qr-text
            className={cn('text-share-muted', tall ? 'text-[15px]' : 'text-[13px]')}
          >
            {counted ? `${rate}% won` : 'No counted games'}
          </span>
        </div>
        <div className="flex flex-col gap-2">
          <span
            data-qr-text
            className="text-[11px] font-semibold tracking-[0.5px] text-share-muted uppercase"
          >
            My session
          </span>
          <div
            className={cn(
              'grid gap-2',
              format === 'story'
                ? 'grid-cols-2 gap-y-3.5'
                : 'auto-cols-[minmax(0,1fr)] grid-flow-col',
            )}
          >
            {stats.map(([label, value]) => (
              <div key={label} className="flex min-w-0 flex-col gap-0.5">
                <b
                  data-qr-text
                  className={cn(
                    'font-mono font-bold text-share-fg',
                    tall ? 'text-[28px]' : 'text-xl',
                    'leading-[1.1]',
                  )}
                >
                  {value}
                </b>
                <span
                  data-qr-text
                  className={cn('text-share-muted', tall ? 'text-xs' : 'text-[10px]')}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }
  return (
    <ShareImagePicker
      shareTitle="Share performance"
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
        fileName: `rotra-performance-${format}`,
        image: (
          <ShareImage
            format={format}
            headline={name}
            subline={nickname ? `“${nickname}”` : 'ROTRA player'}
            spot={{ initials, imageUrl: picture }}
          >
            {content(format)}
          </ShareImage>
        ),
      }))}
    />
  )
}
