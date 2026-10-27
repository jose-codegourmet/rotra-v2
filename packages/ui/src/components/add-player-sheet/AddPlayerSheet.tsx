'use client'

import type { PlayingLevel } from '@rotra/data/player/types'
import type { IdentityCheck } from '@rotra/data/session-roster/types'
import { Avatar } from '@rotra/ui/avatar'
import { Button } from '@rotra/ui/button'
import { cn } from '@rotra/ui/cn'
import { EmptyState } from '@rotra/ui/empty-state'
import { Field } from '@rotra/ui/field'
import { NewPlayerForm, addPlayerSubmitLabel } from '@rotra/ui/forms/new-player-form'
import type { NewPlayerFormValues } from '@rotra/ui/forms/new-player-form/schema'
import { IdentityChip } from '@rotra/ui/identity-chip'
import type { Identity } from '@rotra/ui/identity-chip/variants'
import { Notice } from '@rotra/ui/notice'
import {
  PlayerConfirmCard,
  canConfirmPlayer,
  needsIdentityCheck,
} from '@rotra/ui/player-confirm-card'
import { SegmentedControl } from '@rotra/ui/segmented-control'
import { Sheet } from '@rotra/ui/sheet'
import { Skeleton } from '@rotra/ui/skeleton'
import { TextInput } from '@rotra/ui/text-input'
import { type ReactNode, useEffect, useId, useRef, useState } from 'react'

/** A saved player or a Player Information result the Queue Master can add. Never carries a phone. */
export type AddPlayerCandidate = {
  /** Club player id (saved) or public player id (Player Information) */
  id: string
  name: string
  nickname?: string | null
  photoUrl?: string
  rtrId: string | null
  identity: Identity
  /** Player Information suggestion; null when the player has no level yet */
  suggestion: PlayingLevel | null
  /** The player hides their phone from clubs: the Phone confirmed check is left out */
  phoneHidden?: boolean
  /** Player Information rows only: "Rank 214" or "Not ranked yet" */
  rankLabel?: string
}

export type AddPlayerSource = 'saved' | 'directory'
export type AddPlayerTab = AddPlayerSource | 'new'

export type AddPlayerConfirmInput = {
  candidate: AddPlayerCandidate
  source: AddPlayerSource
  level: PlayingLevel
  /** The check chosen for an unclaimed profile; null for registered profiles and guests */
  identityCheck: IdentityCheck | null
}

export type AddPlayerSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** "Adding to TITLE." */
  sessionTitle: string
  /** The session is live: late players get a level now and it locks */
  live?: boolean
  /** Slots in the session (courts × players per court) */
  capacity: number
  /** Open slots; 0 means new players go on the waitlist */
  openSlots: number
  /** Players already on the waitlist, so the warning can say "#N" */
  waitlistCount: number
  /** Every saved player of the club (the sheet leaves out the ones already in the session) */
  savedPlayers: AddPlayerCandidate[]
  /** Club player ids already on the roster or waitlist */
  inSessionIds: string[]
  /** This device is offline: Player Information search is replaced by a notice */
  offline?: boolean
  /** Called with the Player Information query as it is typed ('' when cleared) */
  onDirectorySearch?: (query: string) => void
  /** Player Information results for the current query */
  directoryResults?: AddPlayerCandidate[]
  /** Player Information lookup running: Skeleton rows (the container must end it, it never spins forever) */
  directoryLoading?: boolean
  /**
   * Decides whether a pick opens the confirmation card. Omitted, every pick does; a container can
   * pass the one-tap rule (registered profile with a level) so those are confirmed straight away.
   */
  needsConfirmStep?: (candidate: AddPlayerCandidate, source: AddPlayerSource) => boolean
  onConfirm: (input: AddPlayerConfirmInput) => void
  onSubmitNewPlayer: (values: NewPlayerFormValues) => void
  /** An add is running: primaries show a spinner and nothing fires twice */
  isPending?: boolean
  /** Why the last add was refused; shown on the card or the form, nothing is claimed as added */
  serverError?: string
  /**
   * The refusal is final for that pick (already on the roster or waitlist): the sheet drops the
   * confirmation card and shows serverError above the list instead of keeping the card. Save
   * failures leave it false so the typed level stays.
   */
  serverErrorReturnsToList?: boolean
  /** Status line after an add, e.g. "Marco Lopez added · Intermediate Mid" */
  lastAdded?: string | null
  /** Adds so far while this sheet has been open; a change clears the tab and refocuses it */
  addedCount?: number
  /** Tab shown when the sheet opens; Saved players unless a story or container says otherwise */
  initialTab?: AddPlayerTab
}

const TABS: { value: AddPlayerTab; label: string }[] = [
  { value: 'saved', label: 'Saved players' },
  { value: 'directory', label: 'Player Information' },
  { value: 'new', label: 'New player' },
]

const LEVEL_ERROR = 'Choose a level for this club before adding.'

const matches = (candidate: AddPlayerCandidate, query: string) =>
  !query ||
  [candidate.name, candidate.nickname, candidate.rtrId].some((v) =>
    v?.toLowerCase().includes(query),
  )

/** The prototypes' .opt row: picture, name, a muted second line and the identity chip. */
function CandidateRow({
  candidate,
  subtitle,
  onPick,
  disabled,
}: {
  candidate: AddPlayerCandidate
  subtitle: ReactNode
  onPick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      disabled={disabled}
      className={cn(
        'flex w-full min-w-0 items-center gap-2.5 rounded-md border border-border-strong bg-bg px-3 py-2.5 text-left',
        'hover:not-disabled:bg-elev disabled:cursor-not-allowed disabled:opacity-45 touch:min-h-12',
      )}
    >
      <Avatar name={candidate.name} src={candidate.photoUrl} />
      <span className="flex min-w-0 flex-1 flex-col">
        <b className="[overflow-wrap:anywhere]">{candidate.name}</b>
        <span className="text-[13px] text-fg2">{subtitle}</span>
      </span>
      <IdentityChip identity={candidate.identity} />
    </button>
  )
}

/**
 * Q-ADD-PLAYER: the Add player sheet that stays open while adding. Saved players, Player
 * Information and New player tabs; picking a player shows PlayerConfirmCard (titled Confirm player
 * for unclaimed profiles). After each add the container passes lastAdded and a new addedCount: the
 * tab clears and focus returns to its first field. A refusal (serverError) stays on the card or the
 * form with what was typed; with serverErrorReturnsToList it drops the card and shows above the list.
 */
export function AddPlayerSheet({
  open,
  onOpenChange,
  sessionTitle,
  live = false,
  capacity,
  openSlots,
  waitlistCount,
  savedPlayers,
  inSessionIds,
  offline = false,
  onDirectorySearch,
  directoryResults = [],
  directoryLoading = false,
  needsConfirmStep,
  onConfirm,
  onSubmitNewPlayer,
  isPending = false,
  serverError,
  serverErrorReturnsToList = false,
  lastAdded,
  addedCount = 0,
  initialTab = 'saved',
}: AddPlayerSheetProps) {
  const formId = useId()
  const bodyRef = useRef<HTMLDivElement>(null)
  const [tab, setTab] = useState<AddPlayerTab>(initialTab)
  const [query, setQuery] = useState('')
  const [pick, setPick] = useState<{
    candidate: AddPlayerCandidate
    source: AddPlayerSource
  } | null>(null)
  const [level, setLevel] = useState<PlayingLevel | null>(null)
  const [check, setCheck] = useState<IdentityCheck | null>(null)
  const [levelError, setLevelError] = useState('')
  // Remounts the search field or the form so it starts empty after an add.
  const [round, setRound] = useState(0)

  const clearTab = () => {
    setQuery('')
    setPick(null)
    setLevel(null)
    setCheck(null)
    setLevelError('')
    setRound((r) => r + 1)
  }

  // Opening starts on the initial tab, cleared; each add clears the current tab. Both are derived
  // while rendering (the React "adjusting state on prop change" pattern), not in an effect.
  const [prevOpen, setPrevOpen] = useState(open)
  const [prevAdded, setPrevAdded] = useState(addedCount)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setTab(initialTab)
      clearTab()
    }
  }
  if (addedCount !== prevAdded) {
    setPrevAdded(addedCount)
    clearTab()
  }
  // A refused pick (a duplicate) goes back to the list; the error shows there, nobody is replaced.
  const [prevError, setPrevError] = useState(serverError)
  if (serverError !== prevError) {
    setPrevError(serverError)
    if (serverError && serverErrorReturnsToList && pick) setPick(null)
  }

  // Focus the first field once the sheet has opened or the tab was cleared. The Sheet focuses its
  // title on open, so this waits a frame and then moves on, as the prototype's data-autofocus does.
  // biome-ignore lint/correctness/useExhaustiveDependencies: tab, round and offline are the triggers, not inputs
  useEffect(() => {
    if (!open || pick) return
    const id = requestAnimationFrame(() => {
      bodyRef.current?.querySelector<HTMLElement>('input, [role="combobox"]')?.focus()
    })
    return () => cancelAnimationFrame(id)
  }, [open, tab, round, pick, offline])

  const changeTab = (next: AddPlayerTab) => {
    setTab(next)
    clearTab()
    if (tab === 'directory') onDirectorySearch?.('')
  }

  const changeQuery = (next: string) => {
    setQuery(next)
    if (tab === 'directory') onDirectorySearch?.(next)
  }

  const pickCandidate = (candidate: AddPlayerCandidate, source: AddPlayerSource) => {
    const confirmStep = needsConfirmStep?.(candidate, source) ?? true
    if (!confirmStep && candidate.suggestion) {
      onConfirm({ candidate, source, level: candidate.suggestion, identityCheck: null })
      return
    }
    setPick({ candidate, source })
    setLevel(candidate.suggestion)
    setCheck(null)
    setLevelError('')
  }

  const confirmPick = () => {
    if (!pick || isPending) return
    if (!level) {
      setLevelError(LEVEL_ERROR)
      return
    }
    onConfirm({ candidate: pick.candidate, source: pick.source, level, identityCheck: check })
  }

  const full = openSlots <= 0
  const q = query.trim().toLowerCase()
  const inSession = new Set(inSessionIds)
  const alreadyCount = savedPlayers.filter((p) => inSession.has(p.id)).length
  const savedList = savedPlayers.filter((p) => !inSession.has(p.id) && matches(p, q))
  const confirming = pick ? needsIdentityCheck(pick.candidate.identity) : false
  const primaryLabel = addPlayerSubmitLabel(full)

  const closeLabel = addedCount > 0 ? 'Done' : 'Cancel'
  const closeButton = (
    <Button disabled={isPending} onClick={() => onOpenChange(false)}>
      {closeLabel}
    </Button>
  )

  let footer: ReactNode = closeButton
  if (pick) {
    footer = (
      <>
        <Button disabled={isPending} onClick={() => setPick(null)}>
          Back
        </Button>
        <Button
          variant="primary"
          loading={isPending}
          disabled={!canConfirmPlayer(pick.candidate.identity, check)}
          onClick={confirmPick}
        >
          {primaryLabel}
        </Button>
      </>
    )
  } else if (tab === 'new') {
    footer = (
      <>
        {closeButton}
        <Button type="submit" form={formId} variant="primary" loading={isPending}>
          {primaryLabel}
        </Button>
      </>
    )
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!isPending) onOpenChange(next)
      }}
      title={confirming ? 'Confirm player' : 'Add player'}
      dismissible={!isPending}
      hideClose={isPending}
      footer={footer}
    >
      <Notice tone="info">
        Adding to <b>{sessionTitle}</b>.
        {live ? ' Late players get a level now, and it locks for the rest of the session.' : null}
      </Notice>
      {lastAdded && !pick ? (
        <Notice tone="success">
          {lastAdded}
          {addedCount > 1 ? (
            <span className="text-[13px] text-fg2"> · {addedCount} added so far</span>
          ) : null}
        </Notice>
      ) : null}
      {full ? (
        <Notice tone="warn" title={`All ${capacity} slots are taken.`}>
          New players go on the waitlist as #{waitlistCount + 1}. You can give them a slot later.
        </Notice>
      ) : null}

      {pick ? (
        <PlayerConfirmCard
          name={pick.candidate.name}
          photoUrl={pick.candidate.photoUrl}
          rtrId={pick.candidate.rtrId}
          identity={pick.candidate.identity}
          phoneHidden={pick.candidate.phoneHidden}
          suggestion={pick.candidate.suggestion}
          level={level}
          onLevelChange={(next) => {
            setLevel(next)
            setLevelError('')
          }}
          check={check}
          onCheckChange={setCheck}
          live={live}
          full={full}
          error={levelError || serverError}
          isPending={isPending}
        />
      ) : (
        <div ref={bodyRef} className="flex flex-col gap-3.5">
          <SegmentedControl
            aria-label="How to add"
            options={TABS}
            value={tab}
            onChange={(next) => changeTab(next as AddPlayerTab)}
          />
          {serverError && tab !== 'new' ? <Notice tone="error">{serverError}</Notice> : null}

          {tab === 'saved' ? (
            <>
              <Field label="Search saved players">
                <TextInput
                  key={round}
                  type="search"
                  value={query}
                  onChange={(event) => changeQuery(event.target.value)}
                  placeholder="Name, nickname or RTR ID"
                  autoComplete="off"
                />
              </Field>
              {alreadyCount > 0 ? (
                <p className="m-0 text-[13px] text-fg2">
                  {alreadyCount} saved player{alreadyCount === 1 ? ' is' : 's are'} already in
                  this session and not listed.
                </p>
              ) : null}
              <div className="flex max-h-80 flex-col gap-1.5 overflow-y-auto">
                {savedList.length ? (
                  savedList.map((candidate) => (
                    <CandidateRow
                      key={candidate.id}
                      candidate={candidate}
                      subtitle={candidate.rtrId ?? 'Guest'}
                      onPick={() => pickCandidate(candidate, 'saved')}
                      disabled={isPending}
                    />
                  ))
                ) : (
                  <EmptyState>
                    {alreadyCount > 0 && !q
                      ? 'Every saved player is already in this session. Add someone new or search Player Information.'
                      : 'No saved player matches. Try Player Information or add a new player.'}
                  </EmptyState>
                )}
              </div>
            </>
          ) : null}

          {tab === 'directory' ? (
            offline ? (
              <Notice tone="warn">
                Player Information search needs internet. Add them as a new player now; their
                profile can be linked after you reconnect.
              </Notice>
            ) : (
              <>
                <Field label="Search Player Information">
                  <TextInput
                    key={round}
                    type="search"
                    value={query}
                    onChange={(event) => changeQuery(event.target.value)}
                    placeholder="Name or RTR ID"
                    autoComplete="off"
                  />
                </Field>
                {directoryLoading ? (
                  <div
                    aria-busy
                    aria-label="Searching Player Information"
                    className="flex flex-col gap-1.5"
                  >
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2.5 rounded-md border border-border-strong bg-bg px-3 py-2.5"
                      >
                        <Skeleton className="size-9 rounded-full" />
                        <span className="flex flex-1 flex-col gap-1.5">
                          <Skeleton className="w-32" />
                          <Skeleton className="h-3 w-44" />
                        </span>
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex max-h-80 flex-col gap-1.5 overflow-y-auto">
                    {directoryResults.length ? (
                      directoryResults.map((candidate) => (
                        <CandidateRow
                          key={candidate.id}
                          candidate={candidate}
                          subtitle={
                            <>
                              <span className="font-mono text-[0.92em]">{candidate.rtrId}</span>
                              {candidate.rankLabel ? ` · ${candidate.rankLabel}` : null}
                            </>
                          }
                          onPick={() => pickCandidate(candidate, 'directory')}
                          disabled={isPending}
                        />
                      ))
                    ) : (
                      <EmptyState>No match in Player Information.</EmptyState>
                    )}
                  </div>
                )}
                <p className="m-0 text-[13px] text-fg2">
                  Results only suggest people. Confirm with the player before linking.
                </p>
              </>
            )
          ) : null}

          {tab === 'new' ? (
            <NewPlayerForm
              key={round}
              id={formId}
              hideSubmit
              live={live}
              full={full}
              isPending={isPending}
              serverError={serverError}
              onSubmit={onSubmitNewPlayer}
            />
          ) : null}
        </div>
      )}
    </Sheet>
  )
}
