'use client'

import { Avatar } from '@rotra/ui/avatar'
import { cn } from '@rotra/ui/cn'
import { SegmentedControl } from '@rotra/ui/segmented-control'
import { SHARE_FORMATS, type ShareFormat, shareInitials } from '@rotra/ui/share-card/helpers'
import { ShareImage } from '@rotra/ui/share-image'
import { ShareImagePicker, type ShareImagePickerItem } from '@rotra/ui/share-image-picker'
import { useState } from 'react'

export type LeaderboardShareRow = {
  position: number
  /** As the page shows names (masked for private players and guests) */
  name: string
  pictureUrl?: string | null
  wins: number
  losses: number
  games: number
  /** The signed-in viewer's row on the session page: highlighted with a YOU tag */
  isViewer?: boolean
}

export type LeaderboardShareCardProps = {
  rows: LeaderboardShareRow[]
  sessionTitle: string
  /** “Thu, Oct 23 · Smash Club” */
  dateLine: string
  club: { initials: string; logoUrl?: string | null }
  /** The Session link under OR */
  link: string
  onCopy: () => void
  webShare?: boolean
  onDownloaded?: (item: ShareImagePickerItem) => void
  onShared?: () => void
  onError?: (message: string) => void
}

/** Places per image: Story 10, Facebook post 8, Square 6 (the prototype's LB_SHARE_ROWS). */
export const LEADERBOARD_SHARE_ROWS: Record<ShareFormat, number> = { story: 10, post: 8, square: 6 }

/**
 * Share leaderboard (2026-11-13-share-leaderboard; the prototype's SHEETS.shareBoard): the size
 * switch beside the picked count, the standings split into images of 10 / 8 / 6 places (rank with
 * the top three in the accent, picture, name ending in an ellipsis, then wins green, losses red,
 * games in the text colour), “#a–b of N” by the ROTRA mark. All images start picked; changing the
 * size re-splits and picks all. The viewer's row is highlighted with a YOU tag and the carousel
 * opens on their image (“#a–b · You're here”). Then OR and the Session link. Put it in ShareDialog.
 */
export function LeaderboardShareCard({
  rows,
  sessionTitle,
  dateLine,
  club,
  link,
  onCopy,
  webShare,
  onDownloaded,
  onShared,
  onError,
}: LeaderboardShareCardProps) {
  const [format, setFormat] = useState<ShareFormat>('post')
  const per = LEADERBOARD_SHARE_ROWS[format]
  const pages = Math.max(1, Math.ceil(rows.length / per))
  const mine = rows.findIndex((row) => row.isViewer)
  const myPage = mine >= 0 ? Math.floor(mine / per) : -1
  const images: Record<string, string | null | undefined> = { spot: club.logoUrl }
  rows.forEach((row, i) => {
    images[`lb-${i}`] = row.pictureUrl
  })

  const items: ShareImagePickerItem[] = Array.from({ length: pages }, (_, k) => {
    const slice = rows.slice(k * per, (k + 1) * per)
    const a = k * per + 1
    const b = k * per + slice.length
    return {
      id: `${format}-${k}`,
      label: `Image ${k + 1}`,
      hint: `#${a}–${b}${k === myPage ? " · You're here" : ''}`,
      format,
      fileName: `rotra-leaderboard-${format}-${k + 1}`,
      image: (
        <ShareImage
          glow="bottom"
          format={format}
          headline={sessionTitle}
          subline={dateLine}
          spot={{ initials: club.initials, imageUrl: club.logoUrl }}
          footerEnd={`#${a}–${b} of ${rows.length}`}
          label={`Leaderboard image ${k + 1}`}
        >
          <span
            data-qr-text
            className="text-[11px] font-bold tracking-[0.6px] text-share-muted uppercase"
          >
            Leaderboard
          </span>
          <ol className="m-0 flex list-none flex-col gap-[3px] p-0">
            {slice.map((row, i) => {
              const index = k * per + i
              return (
                <li
                  key={row.position}
                  data-share-cell={row.isViewer ? 'current' : undefined}
                  className={cn(
                    'grid grid-cols-[20px_22px_minmax(0,1fr)_auto] items-center gap-2 rounded-lg px-2 text-[12px] leading-[1.25]',
                    format === 'story' ? 'py-[3px]' : 'py-0.5',
                    row.isViewer
                      ? 'bg-share-accent/16 shadow-[inset_0_0_0_1.5px_var(--share-accent)]'
                      : 'bg-share-fg/5',
                  )}
                >
                  <span
                    data-qr-text
                    className={cn(
                      'text-center font-extrabold',
                      row.position <= 3 || row.isViewer ? 'text-share-accent' : 'text-share-muted',
                    )}
                  >
                    {row.position}
                  </span>
                  <span
                    data-qr-logo={`lb-${index}`}
                    data-share-initials={shareInitials(row.name)}
                    className="block size-[22px] overflow-hidden rounded-full bg-share-fg/10 text-share-fg"
                  >
                    <Avatar
                      name={row.name}
                      src={row.pictureUrl ?? undefined}
                      size={24}
                      className="size-full bg-share-fg/10 text-[9px] text-share-fg"
                    />
                  </span>
                  <span className="flex min-w-0 items-center">
                    <span
                      data-qr-text
                      className={cn(
                        'min-w-0 truncate font-bold',
                        row.isViewer ? 'text-share-accent' : 'text-share-fg',
                      )}
                    >
                      {row.name}
                    </span>
                    {row.isViewer ? (
                      <em
                        data-qr-text
                        className="ml-1.5 flex-none rounded-[4px] bg-share-accent px-[5px] text-[9px] font-extrabold tracking-[0.5px] text-share-bg uppercase not-italic"
                      >
                        You
                      </em>
                    ) : null}
                  </span>
                  <span className="inline-grid grid-cols-[repeat(3,26px)] justify-items-end text-[10px] font-bold whitespace-nowrap tabular-nums">
                    <span data-qr-text className="text-share-accent">
                      <b className="mr-px text-[12px] font-extrabold">{row.wins}</b>W
                    </span>
                    <span data-qr-text className="text-share-loss">
                      <b className="mr-px text-[12px] font-extrabold">{row.losses}</b>L
                    </span>
                    <span data-qr-text className="text-share-fg">
                      <b className="mr-px text-[12px] font-extrabold">{row.games}</b>G
                    </span>
                  </span>
                </li>
              )
            })}
          </ol>
        </ShareImage>
      ),
    }
  })

  return (
    <ShareImagePicker
      items={items}
      shareTitle={`${sessionTitle} leaderboard`}
      images={images}
      link={link}
      linkLabel="Session link"
      copyLabel="Copy session link"
      onCopy={onCopy}
      pickHint={`${rows.length} players, ${per} per image. Tap an image to pick it.`}
      countUnit={{ one: 'image', other: 'images' }}
      startAt={myPage > 0 ? `${format}-${myPage}` : undefined}
      webShare={webShare}
      onDownloaded={onDownloaded}
      onShared={onShared}
      onError={onError}
      toolbar={
        <SegmentedControl
          aria-label="Image size"
          options={SHARE_FORMATS.map(({ format: value, label }) => ({ value, label }))}
          value={format}
          onChange={(value) => setFormat(value as ShareFormat)}
        />
      }
    />
  )
}
