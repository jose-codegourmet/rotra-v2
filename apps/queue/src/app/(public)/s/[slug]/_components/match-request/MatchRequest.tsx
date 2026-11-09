'use client'

import type { MatchFormat } from '@rotra/data/match/types'
import { NO_MATCH_REQUESTS_TEXT, requestSpots } from '@rotra/data/match-request/rules'
import { useSendMatchRequest } from '@rotra/data/match-request/useSendMatchRequest'
import { useMatchRequestOptions } from '@rotra/data/public-session/useMatchRequestOptions'
import { MatchRequestSheet, type MatchRequestSpotRef } from '@rotra/ui/match-request-sheet'
import { PlayerPickerSheet } from '@rotra/ui/player-picker-sheet'
import { toast } from '@rotra/ui/toaster'
import { useEffect, useState } from 'react'

export type MatchRequestProps = {
  slug: string
  /** The signed-in Player asking (their account id and name) */
  viewer: { id: string; name: string }
  open: boolean
  onOpenChange: (open: boolean) => void
}

type Spots = (string | null)[]

/** Fits a spot list to the count the format needs: keeps what is picked, pads with Anyone. */
const fit = (ids: Spots, count: number): Spots =>
  Array.from({ length: count }, (_, i) => ids[i] ?? null)

const spotLabel = (spot: MatchRequestSpotRef, count: number) =>
  spot.side === 'partner'
    ? count > 1
      ? `Partner ${spot.index + 1}`
      : 'Partner'
    : count > 1
      ? `Opponent ${spot.index + 1}`
      : 'Opponent'

/**
 * Q-PUBLIC-DETAILS (My night › Request a match): wires useMatchRequestOptions and
 * useSendMatchRequest to MatchRequestSheet, with PlayerPickerSheet (matchRequest) on top for a spot.
 * Picks reset with every new request and persist while the sheet is open (also across the picker).
 * Send request toasts "Match request sent"; with no format allowed it toasts "This session isn't
 * taking match requests". A failed send keeps the sheet open and shows the reason in it.
 */
export function MatchRequest({ slug, viewer, open, onOpenChange }: MatchRequestProps) {
  const options = useMatchRequestOptions(slug, viewer.id, open)
  const send = useSendMatchRequest(slug)
  const [format, setFormat] = useState<MatchFormat>('doubles')
  const [partners, setPartners] = useState<Spots>([])
  const [opponents, setOpponents] = useState<Spots>([])
  const [picking, setPicking] = useState<MatchRequestSpotRef | null>(null)
  const [error, setError] = useState<string>()

  // A new request starts clean: first allowed format, every spot Anyone.
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset only when the sheet opens
  useEffect(() => {
    if (!open) return
    setFormat('doubles')
    setPartners([])
    setOpponents([])
    setPicking(null)
    setError(undefined)
    send.reset()
  }, [open])

  const data = options.data
  const allowed = data?.allowedFormats ?? []
  const activeFormat: MatchFormat =
    allowed.length && !allowed.includes(format) ? (allowed[0] ?? format) : format
  const counts = requestSpots(activeFormat)
  const partnerIds = fit(partners, counts.partners)
  const opponentIds = fit(opponents, counts.opponents)
  const players = data?.players ?? []

  const changeFormat = (next: MatchFormat) => {
    setFormat(next)
    setError(undefined)
  }
  const set = (spot: MatchRequestSpotRef, id: string | null) => {
    const update = (ids: Spots, count: number) =>
      fit(ids, count).map((x, i) => (i === spot.index ? id : x))
    if (spot.side === 'partner') setPartners(update(partnerIds, counts.partners))
    else setOpponents(update(opponentIds, counts.opponents))
  }
  const sendRequest = () => {
    if (!allowed.length) {
      toast(NO_MATCH_REQUESTS_TEXT)
      onOpenChange(false)
      return
    }
    setError(undefined)
    send.mutate(
      {
        playerId: viewer.id,
        format: activeFormat,
        partners: partnerIds,
        opponents: opponentIds,
      },
      {
        onSuccess: (done) => {
          toast(done.message)
          onOpenChange(false)
        },
        onError: (e) => setError(e.message),
      },
    )
  }

  const current = picking
    ? ((picking.side === 'partner' ? partnerIds : opponentIds)[picking.index] ?? null)
    : null
  const pickedIds = [...partnerIds, ...opponentIds].filter(
    (id): id is string => !!id && id !== current,
  )

  return (
    <>
      <MatchRequestSheet
        open={open}
        onOpenChange={onOpenChange}
        viewer={{ name: viewer.name, photoUrl: data?.viewerPictureUrl ?? undefined }}
        players={players.map((p) => ({
          id: p.id,
          name: p.name,
          shortName: p.shortName,
          photoUrl: p.pictureUrl ?? undefined,
          level: p.level,
          games: p.games,
        }))}
        minimumGames={data?.minimum ?? 0}
        allowedFormats={allowed}
        format={activeFormat}
        onFormatChange={changeFormat}
        partners={partnerIds}
        opponents={opponentIds}
        onPickSpot={setPicking}
        onClearSpot={(spot) => set(spot, null)}
        onCancel={() => onOpenChange(false)}
        onSend={sendRequest}
        isPending={send.isPending}
        error={error}
      />
      <PlayerPickerSheet
        variant="matchRequest"
        open={open && picking !== null}
        onOpenChange={(next) => {
          if (!next) setPicking(null)
        }}
        spotLabel={
          picking
            ? spotLabel(picking, picking.side === 'partner' ? counts.partners : counts.opponents)
            : ''
        }
        players={players.map((p) => ({
          id: p.id,
          name: p.name,
          photoUrl: p.pictureUrl ?? undefined,
          level: p.level,
          games: p.games,
          playingOn: p.playingOn,
          restMinutes: p.restMinutes,
        }))}
        minimumGames={data?.minimum ?? 0}
        currentId={current}
        pickedIds={pickedIds}
        onChoose={(id) => {
          if (picking) set(picking, id)
          setPicking(null)
        }}
        onAnyone={() => {
          if (picking) set(picking, null)
          setPicking(null)
        }}
        onBack={() => setPicking(null)}
      />
    </>
  )
}
