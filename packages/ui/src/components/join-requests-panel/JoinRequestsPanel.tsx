'use client'

import type { PlayingLevel } from '@rotra/data/player/types'
import type { SessionJoinRequest } from '@rotra/data/session-roster/types'
import { formatPhoneForDisplay } from '@rotra/schema/phone'
import { Avatar } from '@rotra/ui/avatar'
import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { Chip } from '@rotra/ui/chip'
import { cn } from '@rotra/ui/cn'
import { DropOutNoticeRow, type DropOutNoticeRowProps } from '@rotra/ui/drop-out-notice-row'
import { LevelSelect } from '@rotra/ui/level-select'
import { MatchRequestCard, type MatchRequestCardProps } from '@rotra/ui/match-request-card'
import { Notice } from '@rotra/ui/notice'
import { profilePictureSrc } from '@rotra/ui/profile-picture'
import { Skeleton } from '@rotra/ui/skeleton'
import { useId, useState } from 'react'

export type JoinRequestDetails = {
  account?: 'in-club' | 'new-to-club'
  sharedRank?: string | null
  invitedBy?: string
  phoneMatch?: { name: string; linked?: boolean; onLink: () => void; onNotThem: () => void }
  /** A Join from waitlist request: the player's current 1-based place ("Waitlist #N · asks for a slot") */
  waitlistPosition?: number | null
}

/** The player's choice on the request (D-2026-11-11-02), as the Queue Master reads it. */
export function placementLabel(
  placement: SessionJoinRequest['placement'] | undefined,
  waitlistPosition?: number | null,
) {
  if (placement === 'waitlist') return 'Asks to be waitlisted'
  if (placement === 'from_waitlist') return `Waitlist #${waitlistPosition ?? '?'} · asks for a slot`
  return 'Asks for a slot'
}

/** The primary button by choice: Confirm to waitlist, Give slot / Admit player, Confirm guest / Confirm. */
export function confirmLabel(
  r: Pick<SessionJoinRequest, 'placement'>,
  slotsFull: boolean,
  live: boolean,
  account: boolean,
) {
  if (r.placement === 'from_waitlist') return live ? 'Admit player' : 'Give slot'
  if (r.placement === 'waitlist' || (slotsFull && !live)) return 'Confirm to waitlist'
  return account ? 'Confirm' : 'Confirm guest'
}
export type JoinRequestsPanelProps = {
  requestDetails?: Record<string, JoinRequestDetails>
  /** Drop-out notices, listed before Start only */
  dropOuts?: (DropOutNoticeRowProps & { id: string })[]
  /** Open match requests, listed once the session is live only */
  matchRequests?: (MatchRequestCardProps & { id: string })[]
  /**
   * Every join request of the session, any status. The panel lists the pending ones oldest first and
   * counts the decided ones for the empty state.
   */
  requests: SessionJoinRequest[]
  /** No open slot left: confirmed guests go on the waitlist and the primary button says so */
  slotsFull?: boolean
  /**
   * The session has started. There are no tabs: before Start the panel lists join requests and
   * drop-out notices; once live it lists match requests only (join requests close at Start).
   */
  live?: boolean
  /** `card` on Preparation; `sheet` drops the card chrome and heading for the live console's sheet */
  variant?: 'card' | 'sheet'
  /** Requests are still loading: Skeleton rows in place of the list */
  loading?: boolean
  isPending?: boolean
  serverError?: string
  /** Confirm with the level the Queue Master chose for this club */
  onConfirm: (requestId: string, level: PlayingLevel) => void
  onDecline: (requestId: string) => void
  className?: string
}

const BAND_LABEL: Record<SessionJoinRequest['statedBand'], string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  unsure: 'not sure of level',
}

/** The middle of the stated band (prototype bandMid()); nothing for "Not sure". */
function bandMid(band: SessionJoinRequest['statedBand']): PlayingLevel | null {
  return band === 'unsure' ? null : (`${band}_mid` as PlayingLevel)
}

/** "+639175550142" → "0917 555 0142", the way the prototype shows a guest's number. */
function localPhone(phoneE164: string) {
  return formatPhoneForDisplay(phoneE164.replace(/^\+63/, '0'))
}

const formatTime = (at: number) =>
  new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

const LEVEL_ERROR = 'Choose a level for this club before confirming.'

/**
 * The Requests panel, no tabs (owner, November 11, 2026). Live: match requests only. Before Start:
 * drop-out notices, then join requests: each waiting guest with
 * initials, name, phone, stated band and time, the choice they made (Asks for a slot / Asks to be
 * waitlisted / Waitlist #N · asks for a slot; D-2026-11-11-02), a level select preset to the middle
 * of that band, and Decline / Confirm guest (Confirm to waitlist for a waitlist request or when slots
 * are full before start; Give slot / Admit player for a request from the waitlist). Phones show here
 * only, never on public components. While loading it shows Skeleton rows.
 */
export function JoinRequestsPanel({
  requests,
  requestDetails = {},
  dropOuts = [],
  matchRequests = [],
  slotsFull = false,
  live = false,
  variant = 'card',
  loading = false,
  isPending = false,
  serverError,
  onConfirm,
  onDecline,
  className,
}: JoinRequestsPanelProps) {
  const id = useId()
  const [levels, setLevels] = useState<Record<string, PlayingLevel | null>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  const pending = requests
    .filter((r) => r.status === 'pending')
    .sort((a, b) => a.requestedAt - b.requestedAt)
  const confirmed = requests.filter((r) => r.status === 'confirmed').length
  const declined = requests.filter((r) => r.status === 'declined').length

  const levelOf = (r: SessionJoinRequest) =>
    r.id in levels ? (levels[r.id] ?? null) : bandMid(r.statedBand)

  const setLevel = (requestId: string, level: PlayingLevel) => {
    setLevels((prev) => ({ ...prev, [requestId]: level }))
    setErrors(({ [requestId]: _, ...rest }) => rest)
  }

  const confirm = (r: SessionJoinRequest) => {
    if (isPending) return
    const level = levelOf(r)
    if (!level) {
      setErrors((prev) => ({ ...prev, [r.id]: LEVEL_ERROR }))
      return
    }
    onConfirm(r.id, level)
  }

  const inSheet = variant === 'sheet'
  const count = live ? matchRequests.length : pending.length + dropOuts.length
  const heading = count ? `Requests · ${count}` : 'Requests'
  const body = loading ? (
    <section
      id="join-requests"
      aria-busy
      aria-label={live ? 'Loading match requests' : 'Loading join requests'}
      className={cn('flex min-w-0 flex-col gap-3', inSheet && className)}
    >
      {inSheet ? null : <h2>{heading}</h2>}
      <Skeleton className="w-72" />
      <div className="flex flex-col divide-y divide-border">
        {[0, 1].map((i) => (
          <div key={i} className="flex flex-col gap-2.5 py-3">
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-full" />
              <span className="flex flex-1 flex-col gap-1.5">
                <Skeleton className="w-36" />
                <Skeleton className="h-3 w-56" />
              </span>
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 max-sm:grid-cols-1">
              <Skeleton className="h-11 w-full rounded-md" />
              <Skeleton className="h-11 w-56 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </section>
  ) : (
    <section
      id="join-requests"
      aria-labelledby={inSheet ? undefined : `${id}-h`}
      aria-label={inSheet ? heading : undefined}
      className={cn('flex min-w-0 flex-col gap-3', inSheet && className)}
    >
      {inSheet ? null : (
        <div>
          <h2 id={`${id}-h`}>{heading}</h2>
          <p className="m-0 text-[13px] text-fg2">
            {live
              ? 'Match requests from players on the session page.'
              : 'Join requests and drop-out notices from the session page.'}{' '}
            Nothing changes until you act on one.
          </p>
        </div>
      )}
      {live ? (
        <div className="flex flex-col gap-3">
          {serverError ? <Notice tone="error">{serverError}</Notice> : null}
          {matchRequests.length ? (
            <div className="divide-y divide-border">
              {matchRequests.map(({ id: matchId, ...props }) => (
                <MatchRequestCard key={matchId} {...props} />
              ))}
            </div>
          ) : (
            <p className="m-0 text-[13px] text-fg2">
              No match requests. Present players can ask for a match from the session page.
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {dropOuts.length ? (
            <section className="flex flex-col gap-2">
              <h3 className="m-0 text-sm">Can't make it · {dropOuts.length}</h3>
              <p className="m-0 text-[13px] text-fg2">
                The slot stays until you remove the player.
              </p>
              <div className="divide-y divide-border">
                {dropOuts.map(({ id: dropId, ...props }) => (
                  <DropOutNoticeRow key={dropId} {...props} />
                ))}
              </div>
            </section>
          ) : null}
          {pending.length && dropOuts.length ? (
            <h3 className="m-0 text-sm">Join requests · {pending.length}</h3>
          ) : null}
          <p className="m-0 text-[13px] text-fg2">
            {pending.length ? (
              <>
                Check each one is a real person you expect (ask at the door, or match their name and
                phone) before confirming. Oldest first.
                {slotsFull && !live
                  ? ' Slots are full, so confirmed players go on the waitlist.'
                  : ''}
              </>
            ) : (
              <>
                No join requests waiting.
                {confirmed + declined > 0
                  ? ` ${confirmed} confirmed, ${declined} declined so far.`
                  : ' Anyone who opens the session link can ask for a slot; they show up here.'}
              </>
            )}
          </p>
          {serverError ? <Notice tone="error">{serverError}</Notice> : null}
          {pending.length ? (
            <div className="flex flex-col divide-y divide-border">
              {pending.map((r) => {
                const level = levelOf(r)
                const error = errors[r.id]
                const details = requestDetails[r.id]
                return (
                  <div key={r.id} className="flex flex-col gap-2.5 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar
                        name={r.name}
                        src={
                          r.playerId
                            ? profilePictureSrc(r.picture, r.playerId, r.pictureName ?? r.name)
                            : undefined
                        }
                      />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <b className="font-semibold [overflow-wrap:anywhere]">
                          {r.name}
                          {r.nickname ? <span className="text-fg2"> “{r.nickname}”</span> : null}
                        </b>
                        <span className="text-[13px] text-fg2">
                          {details?.account ? (
                            `Requested ${formatTime(r.requestedAt)}`
                          ) : (
                            <>
                              {r.phoneE164 ? localPhone(r.phoneE164) : 'No phone given'} · says{' '}
                              {BAND_LABEL[r.statedBand]} · requested {formatTime(r.requestedAt)}
                            </>
                          )}
                        </span>
                        <span className="text-[13px] font-semibold">
                          {placementLabel(r.placement, details?.waitlistPosition)}
                        </span>
                        {details?.account ? (
                          <span className="text-[13px] text-fg2">
                            Shared rank: {details.sharedRank ?? 'none yet'}
                          </span>
                        ) : null}
                        {details?.invitedBy ? (
                          <span className="text-[13px] text-fg2">
                            Invited by {details.invitedBy}
                          </span>
                        ) : null}
                      </span>
                      {details?.account ? (
                        <Chip tone={details.account === 'in-club' ? 'accent' : 'warn'}>
                          ROTRA player ·{' '}
                          {details.account === 'in-club'
                            ? 'already in your club'
                            : 'new to your club'}
                        </Chip>
                      ) : (
                        <Chip tone="warn">Guest request</Chip>
                      )}
                    </div>
                    {details?.phoneMatch ? (
                      details.phoneMatch.linked ? (
                        <Notice tone="success">
                          Linked to {details.phoneMatch.name} from your saved players.
                        </Notice>
                      ) : (
                        <Notice
                          action={
                            <div className="flex gap-2">
                              <Button
                                size="xs"
                                variant="primary"
                                disabled={isPending}
                                onClick={details.phoneMatch.onLink}
                              >
                                Link
                              </Button>
                              <Button
                                size="xs"
                                disabled={isPending}
                                onClick={details.phoneMatch.onNotThem}
                              >
                                Not them
                              </Button>
                            </div>
                          }
                        >
                          Is this {details.phoneMatch.name} from your saved players?
                        </Notice>
                      )
                    ) : null}
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 max-sm:grid-cols-1">
                      <LevelSelect
                        disabled={isPending}
                        value={level}
                        onChange={(next) => setLevel(r.id, next)}
                        aria-label={`Level for ${r.name}`}
                        missing={Boolean(error) && level == null}
                      />
                      <div className="flex flex-wrap items-center gap-2 max-sm:[&>*]:flex-1">
                        <Button
                          size="sm"
                          disabled={isPending}
                          onClick={() => onDecline(r.id)}
                          aria-label={`Decline ${r.name}`}
                        >
                          Decline
                        </Button>
                        <Button
                          size="sm"
                          disabled={isPending}
                          variant="primary"
                          onClick={() => confirm(r)}
                          aria-label={`${confirmLabel(r, slotsFull, live, !!details?.account)} ${r.name}`}
                        >
                          {confirmLabel(r, slotsFull, live, !!details?.account)}
                        </Button>
                      </div>
                    </div>
                    <span
                      aria-live="polite"
                      className="text-[13px] font-semibold text-error empty:hidden"
                    >
                      {error}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : null}
        </div>
      )}
    </section>
  )

  if (inSheet) return body
  return (
    <Card asChild className={className}>
      {body}
    </Card>
  )
}
