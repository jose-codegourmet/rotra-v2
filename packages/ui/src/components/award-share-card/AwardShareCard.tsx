'use client'

import { Avatar } from '@rotra/ui/avatar'
import { cn } from '@rotra/ui/cn'
import { SHARE_FORMATS, shareInitials } from '@rotra/ui/share-card/helpers'
import { ShareImage } from '@rotra/ui/share-image'
import { ShareImagePicker, type ShareImagePickerItem } from '@rotra/ui/share-image-picker'

/** The player's standing in this session; null or missing without a counted game. */
export type AwardShareStanding = { position: number; of: number; wins: number; losses: number }

export type AwardShareEntry = {
  /** “MVP”, “Most Improved”, “Off Day” */
  award: string
  /** As the page shows names (masked for private players and guests) */
  name: string
  pictureUrl?: string | null
  standing?: AwardShareStanding | null
}

type Common = {
  sessionTitle: string
  /** “Thu, Oct 23” */
  dateLabel: string
  club: { name: string; initials: string; logoUrl?: string | null }
  /** The Session link under OR */
  link: string
  onCopy: () => void
  webShare?: boolean
  onDownloaded?: (item: ShareImagePickerItem) => void
  onShared?: () => void
  onError?: (message: string) => void
}

export type AwardShareCardProps = Common &
  (
    | {
        /** One award: the winner's picture and name, the award big in the accent, record, reason, date */
        kind: 'award'
        entry: AwardShareEntry
        /** “Won more than expected for their level, partners and opponents.” */
        reason: string
      }
    | {
        /** The whole set: Share awards (MVP first, outlined) or Share Off Day */
        kind: 'set'
        set: 'awards' | 'off-day'
        entries: AwardShareEntry[]
      }
  )

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')

/**
 * The award share images (2026-11-13-queue-awards-faces-share; the prototype's SHEETS.shareFinish
 * kind award / awards): Story, Facebook post and Square, then OR and the Session link. One award:
 * the winner's picture and name with the club, the session title, the award big in the accent,
 * “#N of M · W won · L lost”, the reason and the date. The set: the club logo and name, the title
 * and date, “Awards” (or “Off Day”), then one row per award (face, label, name, “#N of M · W won”).
 */
export function AwardShareCard(props: AwardShareCardProps) {
  const { sessionTitle, dateLabel, club, link, onCopy, webShare, onDownloaded, onShared, onError } =
    props
  const images: Record<string, string | null | undefined> =
    props.kind === 'award' ? { spot: props.entry.pictureUrl } : { spot: club.logoUrl }
  if (props.kind === 'set')
    props.entries.forEach((entry, i) => {
      images[`aw-${i}`] = entry.pictureUrl
    })
  const fileKey =
    props.kind === 'award'
      ? props.entry.award.toLowerCase().replace(/\s+/g, '-')
      : props.set === 'off-day'
        ? 'off-day'
        : 'awards'

  const items: ShareImagePickerItem[] = SHARE_FORMATS.map(({ format, label, hint }) => {
    const square = format === 'square'
    const image =
      props.kind === 'award' ? (
        <ShareImage
          glow="bottom"
          key={format}
          format={format}
          headline={props.entry.name}
          subline={club.name}
          spot={{ initials: initialsOf(props.entry.name), imageUrl: props.entry.pictureUrl }}
        >
          <div
            className={cn('flex flex-1 flex-col justify-center', square ? 'gap-1.5' : 'gap-2.5')}
          >
            <span
              data-qr-text
              className="text-[11px] font-bold tracking-[0.6px] text-share-muted uppercase"
            >
              {sessionTitle}
            </span>
            <b
              data-qr-text
              className={cn(
                'leading-[1.05] font-extrabold text-share-accent',
                square ? 'text-[30px]' : 'text-[40px]',
              )}
            >
              {props.entry.award}
            </b>
            {props.entry.standing ? (
              <div className="flex gap-3.5 text-[12px] text-share-muted">
                <span data-qr-text>
                  <b className="text-[16px] text-share-fg">#{props.entry.standing.position}</b> of{' '}
                  {props.entry.standing.of}
                </span>
                <span data-qr-text>
                  <b className="text-[16px] text-share-fg">{props.entry.standing.wins}</b> won
                </span>
                <span data-qr-text>
                  <b className="text-[16px] text-share-fg">{props.entry.standing.losses}</b> lost
                </span>
              </div>
            ) : null}
            <span data-qr-text className="text-[12px] leading-[1.35] text-share-fg">
              {props.reason}
            </span>
            <span data-qr-text className="text-[11px] text-share-muted">
              {dateLabel}
            </span>
          </div>
        </ShareImage>
      ) : (
        <ShareImage
          glow="bottom"
          key={format}
          format={format}
          headline={club.name}
          subline={`${sessionTitle} · ${dateLabel}`}
          spot={{ initials: club.initials, imageUrl: club.logoUrl }}
        >
          <span
            data-qr-text
            className="text-[11px] font-bold tracking-[0.6px] text-share-muted uppercase"
          >
            {props.set === 'off-day' ? 'Off Day' : 'Awards'}
          </span>
          <div className={cn('flex flex-col', square ? 'gap-1.5' : 'gap-2')}>
            {props.entries.map((entry, i) => {
              const first = i === 0 && props.set === 'awards'
              return (
                <div
                  key={`${entry.award}-${entry.name}`}
                  data-share-cell={first ? 'current' : undefined}
                  className={cn(
                    'flex items-center gap-2.5 rounded-xl px-2.5',
                    square ? 'py-1.5' : 'py-2',
                    first
                      ? 'bg-share-accent/12 shadow-[inset_0_0_0_1.5px_var(--share-accent)]'
                      : 'bg-share-fg/5',
                  )}
                >
                  <span
                    data-qr-logo={`aw-${i}`}
                    data-share-initials={shareInitials(entry.name)}
                    className={cn(
                      'block shrink-0 overflow-hidden rounded-full bg-share-fg/10 text-share-fg',
                      square ? 'size-8' : 'size-10',
                    )}
                  >
                    <Avatar
                      name={entry.name}
                      src={entry.pictureUrl ?? undefined}
                      size={40}
                      className="size-full bg-share-fg/10 text-[12px] text-share-fg"
                    />
                  </span>
                  <div className="flex min-w-0 flex-col">
                    <span
                      data-qr-text
                      className={cn(
                        'text-[10px] font-bold tracking-[0.5px] uppercase',
                        first ? 'text-share-accent' : 'text-share-muted',
                      )}
                    >
                      {entry.award}
                    </span>
                    <b data-qr-text className="truncate text-[14px] leading-[1.2] text-share-fg">
                      {entry.name}
                    </b>
                    {entry.standing ? (
                      <em data-qr-text className="text-[11px] text-share-muted not-italic">
                        #{entry.standing.position} of {entry.standing.of} · {entry.standing.wins}{' '}
                        won
                      </em>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        </ShareImage>
      )
    return {
      id: format,
      label,
      hint,
      format,
      fileName: `rotra-${fileKey}-${format}`,
      image,
    }
  })

  return (
    <ShareImagePicker
      items={items}
      shareTitle={
        props.kind === 'award'
          ? `${props.entry.award} · ${sessionTitle}`
          : `${props.set === 'off-day' ? 'Off Day' : 'Awards'} · ${sessionTitle}`
      }
      images={images}
      link={link}
      linkLabel="Session link"
      copyLabel="Copy session link"
      onCopy={onCopy}
      webShare={webShare}
      onDownloaded={onDownloaded}
      onShared={onShared}
      onError={onError}
    />
  )
}
