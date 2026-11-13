'use client'

import type {
  PublicHistoryMatch,
  PublicMatchHistory,
  PublicMatchPlayer,
} from '@rotra/data/public-session/types'
import {
  onCourtAt,
  type RecordMatch,
  type RecordPlayer,
  replayCourtsAt,
  replaySummaryAt,
  type SessionRecordHistory,
} from '@rotra/data/queue-session/sessionRecord.rules'
import type { MatchCourtPlayer } from '@rotra/ui/match-court'
import { PublicMatchHistory as PublicMatchHistorySection } from '@rotra/ui/public-match-history'
import { ReplayCard } from '@rotra/ui/replay-card'
import { useEffect, useState } from 'react'

export type MatchHistoryProps = {
  /** The signed-in read's history; null or missing for a visitor (the Log in line) */
  history: PublicMatchHistory | null | undefined
  /** A face was tapped: its index in the signed-in read's participants (opens the profile card) */
  onOpenParticipant?: (index: number) => void
}

const MINUTE = 60_000
/** One session minute every 120 ms, like the session record's replay. */
const TICK_MS = 120
const FACE_PREFIX = 'participant:'

const time = (at: number) =>
  new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
const isMine = (m: PublicHistoryMatch) => [...m.teamA, ...m.teamB].some((p) => p.isViewer === true)

/** The history in the session record's replay shape, so the same replay rules draw it. */
function replayHistory(history: PublicMatchHistory): SessionRecordHistory {
  const player = (m: PublicHistoryMatch, side: 'a' | 'b') => (p: PublicMatchPlayer, i: number) => {
    const face: RecordPlayer & { photoUrl?: string } = {
      id: p.participant === undefined ? `${m.id}-${side}-${i}` : `${FACE_PREFIX}${p.participant}`,
      name: p.isViewer ? 'You' : p.name,
      shortName: p.isViewer ? 'You' : p.name,
      level: p.level,
      photoUrl: p.pictureUrl ?? undefined,
    }
    return face
  }
  const matches: RecordMatch[] = [...history.matches]
    .sort((a, b) => a.startedAt - b.startedAt)
    .map((m) => ({
      id: m.id,
      number: m.number,
      courtLabels: m.courtLabels,
      startedAt: m.startedAt,
      endedAt: m.endedAt,
      replayEndAt: m.replayEndAt,
      fun: m.format.startsWith('fun_'),
      teamA: m.teamA.map(player(m, 'a')),
      teamB: m.teamB.map(player(m, 'b')),
      winningTeam: m.winningTeam,
      teamAScore: m.teamAScore,
      teamBScore: m.teamBScore,
      invalid: m.invalid,
      substitutions: 0,
      substitutionCredits: [],
    }))
  return { courtLabels: history.courtLabels, matches, from: history.from, to: history.to }
}

/**
 * Finished session page › Details › Match history (2026-11-13 finished session and match history
 * courts logs): PublicMatchHistory with Yours (default) and All. On All, once the results are
 * shared, How the night went (ReplayCard) opens at the end of the night; the list follows it:
 * only matches started by the replay's time show (newest first) and those on court glow. Play
 * starts from the first match. The viewer's pair sits on the left, labelled “You”.
 */
export function MatchHistory({ history, onOpenParticipant }: MatchHistoryProps) {
  const [tab, setTab] = useState<'mine' | 'all'>('mine')
  const [moment, setMoment] = useState<number | null>(null)
  const [playing, setPlaying] = useState(false)
  const replay = history?.shared ? replayHistory(history) : null
  const end = replay?.to ?? null

  useEffect(() => {
    if (!playing || end === null) return
    const timer = setInterval(() => {
      setMoment((current) => Math.min(end, (current ?? end) + MINUTE))
    }, TICK_MS)
    return () => clearInterval(timer)
  }, [playing, end])
  // Playback stops at the last match end.
  useEffect(() => {
    if (playing && end !== null && moment !== null && moment >= end) setPlaying(false)
  }, [playing, end, moment])

  if (!history)
    return (
      <PublicMatchHistorySection
        signedIn={false}
        tab="mine"
        onTabChange={() => {}}
        mineCount={0}
        allCount={0}
        shared={false}
        items={[]}
      />
    )

  const t = replay ? Math.min(replay.to, Math.max(replay.from, moment ?? replay.to)) : 0
  const openFace = (p: PublicMatchPlayer) =>
    onOpenParticipant && p.participant !== undefined
      ? () => onOpenParticipant(p.participant as number)
      : undefined
  const face = (m: PublicHistoryMatch, side: string) => (p: PublicMatchPlayer, i: number) =>
    ({
      key: `${m.id}-${side}-${i}`,
      name: p.isViewer ? 'You' : p.name,
      label: p.isViewer ? 'You' : (p.name.split(/\s+/)[0] ?? p.name),
      pictureUrl: p.pictureUrl,
      onOpen: openFace(p),
    }) satisfies MatchCourtPlayer
  const item = (m: PublicHistoryMatch) => {
    const mine = isMine(m)
    const flip = mine && m.teamB.some((p) => p.isViewer === true)
    const left = flip ? m.teamB : m.teamA
    const right = flip ? m.teamA : m.teamB
    const leftScore = flip ? m.teamBScore : m.teamAScore
    const rightScore = flip ? m.teamAScore : m.teamBScore
    return {
      id: m.id,
      number: m.number,
      timeLabel: `${time(m.startedAt)}–${time(m.endedAt)}`,
      fun: m.format.startsWith('fun_'),
      left: left.map(face(m, 'l')),
      right: right.map(face(m, 'r')),
      winner: m.winningTeam
        ? (m.winningTeam === 'A') !== flip
          ? ('left' as const)
          : ('right' as const)
        : null,
      score: leftScore != null && rightScore != null ? `${leftScore}–${rightScore}` : null,
      invalid: m.invalid,
      mine,
      now: tab === 'all' && !!replay && onCourtAt(m, t),
    }
  }
  const mineList = history.matches.filter(isMine)
  const list =
    tab === 'mine'
      ? mineList
      : history.shared
        ? history.matches.filter((m) => m.startedAt <= t)
        : []

  return (
    <PublicMatchHistorySection
      signedIn
      tab={tab}
      onTabChange={setTab}
      mineCount={mineList.length}
      allCount={history.total}
      shared={history.shared}
      items={list.map(item)}
      replay={
        replay ? (
          <ReplayCard
            courts={replayCourtsAt(replay, t)}
            from={replay.from}
            to={replay.to}
            value={t}
            playing={playing}
            onSeek={(value) => {
              setPlaying(false)
              setMoment(value)
            }}
            onTogglePlay={() => {
              if (playing) return setPlaying(false)
              // Opens at the end of the night: Play starts from the first match.
              if (t >= replay.to) setMoment(replay.from)
              setPlaying(true)
            }}
            summary={replaySummaryAt(replay, t)}
            onSelectPlayer={(id) => {
              if (id.startsWith(FACE_PREFIX))
                onOpenParticipant?.(Number(id.slice(FACE_PREFIX.length)))
            }}
          />
        ) : undefined
      }
    />
  )
}
