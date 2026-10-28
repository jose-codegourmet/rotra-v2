'use client'

import {
  onCourtAt,
  replayCourtsAt,
  replaySummaryAt,
} from '@rotra/data/queue-session/sessionRecord.rules'
import type { SessionRecordSummary } from '@rotra/data/queue-session/types'
import { useSessionRecordHistory } from '@rotra/data/queue-session/useSessionRecordHistory'
import { InvalidSessionNotice } from '@rotra/ui/invalid-session-notice'
import { RecordCourtColumns } from '@rotra/ui/record-court-columns'
import { RecordTabHeader } from '@rotra/ui/record-tab-header'
import { ReplayCard } from '@rotra/ui/replay-card'
import { Skeleton } from '@rotra/ui/skeleton'
import { useEffect, useState } from 'react'
import { QueryError } from '@/app/(operator)/_components/query-error/QueryError'
import { PlayerProfile } from '@/app/(operator)/sessions/[sessionId]/_components/player-profile/PlayerProfile'

export type RecordNightTabProps = {
  sessionId: string
  record: SessionRecordSummary
}

const MINUTE = 60_000
/** One session minute every 120 ms: a three-hour night plays in about 20 seconds. */
const TICK_MS = 120

const EXPLAINER =
  'Play or drag the timeline to see the courts at any moment. Every match is listed below by court, in the order it was played; winners are highlighted.'

/**
 * The How the night ran tab of the session record (Q-HISTORY): the ReplayCard, then one column per
 * court of MatchRecordCards in start order, with the matches on court at the replay moment
 * highlighted. Replay state is local: Play advances one session minute every 120 ms and stops at
 * the end; scrubbing pauses and moves the moment. Switching tabs unmounts the panel, which stops
 * playback. An invalid session shows the no-match-history notice.
 */
export function RecordNightTab({ sessionId, record }: RecordNightTabProps) {
  const invalid = record.state === 'invalid'
  const history = useSessionRecordHistory(sessionId)
  const [moment, setMoment] = useState<number | null>(null)
  const [playing, setPlaying] = useState(false)
  const [profileId, setProfileId] = useState<string | null>(null)

  const h = history.data
  useEffect(() => {
    if (!playing || !h) return
    const timer = setInterval(() => {
      setMoment((current) => Math.min(h.to, (current ?? h.from) + MINUTE))
    }, TICK_MS)
    return () => clearInterval(timer)
  }, [playing, h])
  // Playback stops at the last match end.
  useEffect(() => {
    if (playing && h && moment !== null && moment >= h.to) setPlaying(false)
  }, [playing, h, moment])

  if (invalid) return <InvalidSessionNotice variant="night" />

  const openProfile = (sessionPlayerId: string) =>
    setProfileId(
      record.playerSummaries.find((p) => p.sessionPlayerId === sessionPlayerId)?.clubPlayerId ??
        null,
    )

  const header = <RecordTabHeader title="How the night ran" description={EXPLAINER} />
  if (history.isError)
    return (
      <div className="flex flex-col gap-4">
        {header}
        <QueryError query={history} title="Couldn't load the match history." />
      </div>
    )
  if (!h)
    return (
      <div className="flex flex-col gap-4">
        {header}
        <div
          role="status"
          aria-busy
          aria-label="Loading the match history"
          className="flex flex-col gap-3"
        >
          <Skeleton className="h-72 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
        </div>
      </div>
    )

  const t = Math.min(h.to, Math.max(h.from, moment ?? h.from))
  const columns = h.courtLabels.map((label) => ({
    label,
    matches: h.matches
      .filter((m) => m.courtLabels[0] === label)
      .map((m) => ({
        id: m.id,
        number: m.number,
        startedAt: m.startedAt,
        endedAt: m.endedAt,
        fun: m.fun,
        teamA: m.teamA,
        teamB: m.teamB,
        winningTeam: m.winningTeam,
        score:
          m.teamAScore != null && m.teamBScore != null
            ? { teamA: m.teamAScore, teamB: m.teamBScore }
            : null,
        invalid: m.invalid,
        substitutions: m.substitutions,
        highlighted: onCourtAt(m, t),
      })),
  }))

  return (
    <div className="flex flex-col gap-4">
      {header}
      <ReplayCard
        courts={replayCourtsAt(h, t)}
        from={h.from}
        to={h.to}
        value={t}
        playing={playing}
        onSeek={(value) => {
          setPlaying(false)
          setMoment(value)
        }}
        onTogglePlay={() => {
          if (playing) return setPlaying(false)
          // Play from the start again once the replay has reached the end.
          if (t >= h.to) setMoment(h.from)
          setPlaying(true)
        }}
        summary={replaySummaryAt(h, t)}
        onSelectPlayer={openProfile}
      />
      <RecordCourtColumns columns={columns} onSelectPlayer={openProfile} />
      <PlayerProfile clubPlayerId={profileId} onClose={() => setProfileId(null)} />
    </div>
  )
}
