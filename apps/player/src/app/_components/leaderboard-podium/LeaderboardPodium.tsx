'use client'
import { PLAYER_FIXTURE_NOW } from '@rotra/data/fixtures/player-games'
import { leaderboardPeriodStart } from '@rotra/data/leaderboard/rules'
import type {
  LeaderboardPeriod,
  LeaderboardRow as LeaderboardRowData,
} from '@rotra/data/leaderboard/types'
import { isRealDataMode } from '@rotra/data/real/mode'
import { Chip } from '@rotra/ui/chip'
import { LEADERBOARD_PERIOD_COPY, leaderboardWinsLabel } from '@rotra/ui/leaderboard-period-switch'
import { PodiumPlaceDialog } from '@rotra/ui/podium-place-dialog'
import { type PodiumPosition, TopThreePodium } from '@rotra/ui/top-three-podium'
import { useState } from 'react'
import type { ProfileCardPerson } from '@/app/_components/profile-card/ProfileCard'
import { pictureSrc } from '@/app/_components/profile-picture/pictureSrc'

const manila = (options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', ...options })
const yearFormat = manila({ year: 'numeric' })
const monthFormat = manila({ month: 'long', year: 'numeric' })
const shortMonthFormat = manila({ month: 'short' })
const dayFormat = manila({ month: 'short', day: 'numeric' })
const DAY = 86_400_000

/** "2026", "Oct to Dec 2026", "November 2026", "Nov 23 to Nov 29" (Asia/Manila periods). */
export function leaderboardDateLabel(period: LeaderboardPeriod, periodStart?: string) {
  const start = periodStart
    ? Date.parse(periodStart)
    : leaderboardPeriodStart(period, isRealDataMode() ? Date.now() : PLAYER_FIXTURE_NOW.getTime())
  if (period === 'year') return yearFormat.format(start)
  if (period === 'month') return monthFormat.format(start)
  // 70 days in always lands in a quarter's third month.
  if (period === 'quarter')
    return `${shortMonthFormat.format(start)} to ${shortMonthFormat.format(start + 70 * DAY)} ${yearFormat.format(start)}`
  return `${dayFormat.format(start)} to ${dayFormat.format(start + 6 * DAY)}`
}

/** `masked` only means the viewer may not open this profile; the row still shows the full name. */
export const leaderboardRowOpens = (row: LeaderboardRowData) => !row.masked

/** The profile card for a leaderboard row the viewer may open. */
export function leaderboardProfilePerson(
  row: LeaderboardRowData,
  viewerId?: string,
): ProfileCardPerson {
  return {
    playerId: row.id,
    name: row.fullName,
    nickname: row.nickname,
    picture: row.pictureUrl,
    level: row.levelHidden ? null : row.playingLevel,
    isYou: row.id === viewerId,
    masked: false,
    bannerKey: row.bannerKey,
    bannerImageUrl: row.bannerImageUrl,
  }
}

/** How many loaded rows hold each place: a place held by more than one is shared. */
export function placeCounts(rows: readonly LeaderboardRowData[]) {
  const counts = new Map<number, number>()
  for (const row of rows) counts.set(row.position, (counts.get(row.position) ?? 0) + 1)
  return counts
}

const winRate = (row: LeaderboardRowData) =>
  Math.round((row.wins / Math.max(1, row.wins + row.losses)) * 100)

/**
 * P-LEADERBOARD / P-CLUB-PAGE / P-CLUB-LEADERBOARD podium (rotra-player.html `podium`,
 * `lbPlaceSheet`): places 1 to 3 from the rows' shared places, and the shared place dialog.
 */
export function LeaderboardPodium({
  rows,
  period,
  dateLabel,
  scope,
  viewerId,
  onOpenPlayer,
}: {
  /** The loaded rows in list order; places 1 to 3 go on the podium */
  rows: readonly LeaderboardRowData[]
  period: LeaderboardPeriod
  dateLabel: string
  /** "ROTRA" or the club's name, at the start of the dialog's line */
  scope: string
  viewerId?: string
  onOpenPlayer: (row: LeaderboardRowData) => void
}) {
  const [openPlace, setOpenPlace] = useState<PodiumPosition | null>(null)
  const [dialogPlace, setDialogPlace] = useState<PodiumPosition>(1)
  const label = LEADERBOARD_PERIOD_COPY[period].label
  const at = (position: number) => rows.filter((row) => row.position === position)
  const places = ([1, 2, 3] as const).map((position) => ({
    position,
    players: at(position).map((row) => ({
      id: row.id,
      name: row.fullName,
      nickname: row.nickname,
      pictureUrl: pictureSrc(row.pictureUrl, row.id, row.fullName) ?? null,
      stat: leaderboardWinsLabel(row.wins),
      isMe: row.id === viewerId,
      canOpen: leaderboardRowOpens(row),
    })),
  }))
  const open = (id: string) => {
    const row = rows.find((entry) => entry.id === id)
    if (row && leaderboardRowOpens(row)) onOpenPlayer(row)
  }
  const inPlace = at(dialogPlace)
  return (
    <>
      <TopThreePodium
        places={places}
        caption={`${label} · ${dateLabel} · top 50`}
        onOpenPlayer={open}
        onOpenPlace={(position) => {
          setDialogPlace(position)
          setOpenPlace(position)
        }}
      />
      <PodiumPlaceDialog
        open={openPlace !== null}
        onOpenChange={(next) => {
          if (!next) setOpenPlace(null)
        }}
        position={dialogPlace}
        description={`${scope} · ${label} · ${dateLabel}. The same wins and the same win rate, so they share this place.`}
        statLayout="stacked"
        players={inPlace.map((row) => ({
          id: row.id,
          name: row.fullName,
          nickname: row.nickname,
          pictureUrl: pictureSrc(row.pictureUrl, row.id, row.fullName) ?? null,
          tags:
            row.id === viewerId || row.unclaimed ? (
              <>
                {row.id === viewerId ? <Chip tone="accent">You</Chip> : null}
                {row.unclaimed ? <Chip tone="warn">Not registered yet</Chip> : null}
              </>
            ) : undefined,
          stats: [
            { value: row.wins.toLocaleString('en-PH'), label: row.wins === 1 ? 'win' : 'wins' },
            { value: `${winRate(row)}%`, label: 'win rate' },
          ],
          canOpen: leaderboardRowOpens(row),
        }))}
        onOpenPlayer={(id) => {
          setOpenPlace(null)
          open(id)
        }}
      />
    </>
  )
}
