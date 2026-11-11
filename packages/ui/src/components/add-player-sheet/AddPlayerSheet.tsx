'use client'

import type { PlayingLevel } from '@rotra/data/player/types'
import { Avatar } from '@rotra/ui/avatar'
import { Button } from '@rotra/ui/button'
import { cn } from '@rotra/ui/cn'
import { EmptyState } from '@rotra/ui/empty-state'
import { Field } from '@rotra/ui/field'
import { addPlayerSubmitLabel, NewPlayerForm } from '@rotra/ui/forms/new-player-form'
import type {
  NewPlayerFormValues,
  NewSavedPlayerFormValues,
} from '@rotra/ui/forms/new-player-form/schema'
import { IdentityChip } from '@rotra/ui/identity-chip'
import type { Identity } from '@rotra/ui/identity-chip/variants'
import { Notice } from '@rotra/ui/notice'
import { PlayerConfirmCard } from '@rotra/ui/player-confirm-card'
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
  /** The player hides their phone from clubs: the card says so instead of showing a number */
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
}

/** Saving to the saved players with no session: the level may stay empty (no level yet). */
export type AddPlayerClubConfirmInput = Omit<AddPlayerConfirmInput, 'level' | 'source'> & {
  source: 'directory'
  level: PlayingLevel | null
}

/** Adding to a session's roster (preparation Add player, console Add late player). */
type AddPlayerSessionContext = {
  context?: 'session'
  /** "Adding to TITLE." */
  sessionTitle: string
  /** The session is live: late players get a level now and it locks */
  live?: boolean
  /** Slots in the session (courts × players per court) */
  capacity: number
  /** Open slots; 0 means prepared additions go on the waitlist */
  openSlots: number
  /** Players already on the waitlist, so the warning can say "#N" */
  waitlistCount: number
  /** Every saved player of the club (the sheet leaves out the ones already in the session) */
  savedPlayers: AddPlayerCandidate[]
  /** Club player ids already on the roster or waitlist */
  inSessionIds: string[]
  onConfirm: (input: AddPlayerConfirmInput) => void
  onSubmitNewPlayer: (values: NewPlayerFormValues) => void
}

/**
 * Saved players › Add player: saves to the club's saved players only, never to a session. No slots,
 * waitlist or Saved players tab (everyone there is already saved); the level is optional.
 */
type AddPlayerClubContext = {
  context: 'club'
  onConfirm: (input: AddPlayerClubConfirmInput) => void
  onSubmitNewPlayer: (values: NewSavedPlayerFormValues) => void
}

export type AddPlayerSheetProps = (AddPlayerSessionContext | AddPlayerClubContext) & {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** This device is offline: Player Information search is replaced by a notice */
  offline?: boolean
  /** Called with the Player Information query as it is typed ('' when cleared) */
  onDirectorySearch?: (query: string) => void
  /** Player Information results for the current query */
  directoryResults?: AddPlayerCandidate[]
  /** Player Information lookup running: Skeleton rows (the container must end it, it never spins forever) */
  directoryLoading?: boolean
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
  /** Status line after an add, e.g. "Santino added · Intermediate Mid" */
  lastAdded?: string | null
  /** Adds so far while this sheet has been open; a change clears the tab and refocuses it */
  addedCount?: number
  /** Tab shown when the sheet opens; Saved players (Player Information in the club context) unless a story or container says otherwise */
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
 * Information and New player tabs. A pick with a level is added in one tap at that level; a pick
 * without one opens PlayerConfirmCard for the level. No identity check; the title is always "Add
 * player" (owner, November 11, 2026). After each add the container passes lastAdded and a new addedCount: the
 * tab clears and focus returns to its first field. A refusal (serverError) stays on the card or the
 * form with what was typed; with serverErrorReturnsToList it drops the card and shows above the list.
 */
export function AddPlayerSheet(props: AddPlayerSheetProps) {
  const {
    open,
    onOpenChange,
    offline = false,
    onDirectorySearch,
    directoryResults = [],
    directoryLoading = false,
    isPending = false,
    serverError,
    serverErrorReturnsToList = false,
    lastAdded,
    addedCount = 0,
  } = props
  const club = props.context === 'club'
  const session = props.context === 'club' ? null : props
  const live = session?.live ?? false
  const savedPlayers = session?.savedPlayers ?? []
  const initialTab = props.initialTab ?? (club ? 'directory' : 'saved')
  const tabs = club ? TABS.filter((t) => t.value !== 'saved') : TABS
  const formId = useId()
  const bodyRef = useRef<HTMLDivElement>(null)
  const [tab, setTab] = useState<AddPlayerTab>(initialTab)
  const [query, setQuery] = useState('')
  const [pick, setPick] = useState<{
    candidate: AddPlayerCandidate
    source: AddPlayerSource
  } | null>(null)
  const [level, setLevel] = useState<PlayingLevel | null>(null)
  const [levelError, setLevelError] = useState('')
  // Remounts the search field or the form so it starts empty after an add.
  const [round, setRound] = useState(0)

  const clearTab = () => {
    setQuery('')
    setPick(null)
    setLevel(null)
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

  const confirm = (
    input: Omit<AddPlayerConfirmInput, 'level'> & { level: PlayingLevel | null },
  ) => {
    if (props.context === 'club') props.onConfirm({ ...input, source: 'directory' })
    else if (input.level) props.onConfirm({ ...input, level: input.level })
  }

  // Any pick with a level is added in one tap at that level (it can still change on the roster
  // before Start); without one, the level step opens.
  const pickCandidate = (candidate: AddPlayerCandidate, source: AddPlayerSource) => {
    if (candidate.suggestion) {
      confirm({ candidate, source, level: candidate.suggestion })
      return
    }
    setPick({ candidate, source })
    setLevel(candidate.suggestion)
    setLevelError('')
  }

  const confirmPick = () => {
    if (!pick || isPending) return
    // Saving with no session may leave the level empty; adding to a session needs one.
    if (!level && !club) {
      setLevelError(LEVEL_ERROR)
      return
    }
    confirm({ candidate: pick.candidate, source: pick.source, level })
  }

  const full = session !== null && !live && session.openSlots <= 0
  const q = query.trim().toLowerCase()
  const inSession = new Set(session?.inSessionIds)
  const alreadyCount = savedPlayers.filter((p) => inSession.has(p.id)).length
  const savedList = savedPlayers.filter((p) => !inSession.has(p.id) && matches(p, q))
  const primaryLabel = addPlayerSubmitLabel(full, false, props.context)

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
        <Button variant="primary" loading={isPending} onClick={confirmPick}>
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
      title="Add player"
      dismissible={!isPending}
      hideClose={isPending}
      footer={footer}
    >
      {session ? (
        <Notice tone="info">
          Adding to <b>{session.sessionTitle}</b>.
          {live ? ' Late players get a level now, and it locks for the rest of the session.' : null}
        </Notice>
      ) : (
        <Notice tone="info">Adding to your saved players. They won't be added to a session.</Notice>
      )}
      {lastAdded && !pick ? (
        <Notice tone="success">
          {lastAdded}
          {addedCount > 1 ? (
            <span className="text-[13px] text-fg2"> · {addedCount} added so far</span>
          ) : null}
        </Notice>
      ) : null}
      {full && session ? (
        <Notice tone="warn" title={`All ${session.capacity} slots are taken.`}>
          New players go on the waitlist as #{session.waitlistCount + 1}. You can give them a slot
          later.
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
          live={live}
          full={full}
          context={props.context}
          error={levelError || serverError}
          isPending={isPending}
        />
      ) : (
        <div ref={bodyRef} className="flex flex-col gap-3.5">
          <SegmentedControl
            aria-label="How to add"
            options={tabs}
            value={tab}
            onChange={(next) => changeTab(next as AddPlayerTab)}
          />
          {serverError && tab !== 'new' ? <Notice tone="error">{serverError}</Notice> : null}

          {tab === 'saved' && !club ? (
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
                  {alreadyCount} saved player{alreadyCount === 1 ? ' is' : 's are'} already in this
                  session and not listed.
                </p>
              ) : null}
              <div className="flex max-h-80 flex-col gap-1.5 overflow-y-auto">
                {savedList.length ? (
                  savedList.map((candidate) => (
                    <CandidateRow
                      key={candidate.id}
                      candidate={candidate}
                      subtitle={
                        candidate.rtrId ??
                        (candidate.identity === 'unclaimed' ? 'Not registered yet' : 'Guest')
                      }
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
                    role="status"
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
            props.context === 'club' ? (
              <NewPlayerForm
                key={round}
                id={formId}
                hideSubmit
                context="club"
                isPending={isPending}
                serverError={serverError}
                onSubmit={props.onSubmitNewPlayer}
              />
            ) : (
              <NewPlayerForm
                key={round}
                id={formId}
                hideSubmit
                live={live}
                full={full}
                isPending={isPending}
                serverError={serverError}
                onSubmit={props.onSubmitNewPlayer}
              />
            )
          ) : null}
        </div>
      )}
    </Sheet>
  )
}
