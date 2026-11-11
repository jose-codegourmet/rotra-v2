'use client'

import type { BaggingGames } from '@rotra/data/match/auto-queue-types'
import type { MatchFormat } from '@rotra/data/match/types'
import type { PlayingLevel } from '@rotra/data/player/types'
import { BaggingPairSheet } from '@rotra/ui/bagging-pair-sheet'
import {
  BaggingPairsCard,
  type BaggingPairView,
  type BaggingPlayer,
} from '@rotra/ui/bagging-pairs-card'
import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { Chip } from '@rotra/ui/chip'
import { Field } from '@rotra/ui/field'
import { MatchCard, type MatchCardPlayer, type MatchCardPlayerChip } from '@rotra/ui/match-card'
import { Notice } from '@rotra/ui/notice'
import { OverflowMenu } from '@rotra/ui/overflow-menu'
import { SegmentedControl } from '@rotra/ui/segmented-control'
import { SelectionBar } from '@rotra/ui/selection-bar'
import { Sheet } from '@rotra/ui/sheet'
import { Switch } from '@rotra/ui/switch'
import { Tabs, TabsContent } from '@rotra/ui/tabs'
import { TextInput } from '@rotra/ui/text-input'
import { DRAFT_TILE_MIN, useQueueColumns } from '@rotra/ui/upcoming-queue-row'
import { type ReactNode, useEffect, useId, useRef, useState } from 'react'

export type AutoQueueMode = 'available' | 'ahead' | 'wait' | 'fewest' | 'catchup'
export type AutoQueueCount = 2 | 3 | 4 | 6
export type QueueWorkspace = 'main' | 'auto'

export type AutoQueueDraftPlayer = {
  id: string
  /** Nickname or first name, under the picture */
  name: string
  /** Full name for the picture's title; falls back to name */
  fullName?: string
  level?: PlayingLevel | null
  photoUrl?: string
  played: number
  queued: number
  suggested: number
  /** A temporary dependency: this player is in a match now. */
  playingNow?: boolean
}

export type AutoQueueDraft = {
  id: string
  format: MatchFormat
  teamA: AutoQueueDraftPlayer[]
  teamB: AutoQueueDraftPlayer[]
  reason: string
  /** Drafts can be selected for later matches even while someone is playing. */
  blockedReason?: string
  /** A transfer conflict that needs the Queue Master's attention. */
  attentionReason?: string
}

export type AutoQueueBatch = {
  drafts: AutoQueueDraft[]
  stale?: boolean
  stopReason?: string
  error?: string
}

/**
 * Bagging mode (#739): the session-wide switch in the header and, while on, the Bagging pairs card
 * and the Add bagging pair sheet. Leave the prop out when the session has no doubles: the switch is
 * then not offered.
 */
export type AutoQueueBaggingProps = {
  enabled: boolean
  onEnabledChange: (enabled: boolean) => void
  pairs: BaggingPairView[]
  /** Every present roster player, for the Add bagging pair sheet */
  players: BaggingPlayer[]
  /** Add pair / Replace pair: the container removes any pair either player was in */
  onAddPair: (pair: {
    a: string
    b: string
    games: BaggingGames
  }) => boolean | void | Promise<boolean | void>
  /** A tap on a pair's games row; the container applies toggleBaggingGame */
  onToggleGame: (pairId: string, value: 'all' | number) => void
  onRemovePair: (pairId: string) => void
}

export type AutoQueueWorkspaceProps = {
  workspace: QueueWorkspace
  onWorkspaceChange: (workspace: QueueWorkspace) => void
  /** The existing Main Queue controls and cards, supplied by the queue container. */
  mainQueue: ReactNode
  mode: AutoQueueMode
  onModeChange: (mode: AutoQueueMode) => void
  count: AutoQueueCount | null
  onCountChange: (count: AutoQueueCount) => void
  minimumGames: number
  hasEligiblePlayers: boolean
  catchUpTarget: string
  onCatchUpTargetChange: (target: string) => void
  batches: Partial<Record<AutoQueueMode, AutoQueueBatch>>
  /** Draft IDs in the order selected across all five tabs. */
  selectedIds: string[]
  onSelect: (draftId: string, selected: boolean) => void
  /** The selection bar's Clear: unselects every draft in every tab */
  onUnselectAll: () => void
  onGenerate: (mode: AutoQueueMode, count: AutoQueueCount, target: string) => void
  onRegenerate: (mode: AutoQueueMode, count: AutoQueueCount, target: string) => void
  onRegenerateUnselected: (mode: AutoQueueMode, count: AutoQueueCount, target: string) => void
  onClear: (mode: AutoQueueMode) => void
  onClearUnselected: (mode: AutoQueueMode) => void
  /** Called after the Queue Master reviews the final selection order. */
  onAddToMainQueue: (draftIds: string[]) => boolean | void | Promise<boolean | void>
  transferError?: string
  isPending?: boolean
  pendingMessage?: string
  /** Bagging mode; omitted when the session has no doubles */
  bagging?: AutoQueueBaggingProps
}

const MODE_ITEMS: { value: AutoQueueMode; label: string; shortLabel: string }[] = [
  { value: 'available', label: 'Available Players', shortLabel: 'Available' },
  { value: 'ahead', label: 'Plan Ahead', shortLabel: 'Ahead' },
  { value: 'wait', label: 'Longest Wait', shortLabel: 'Wait' },
  { value: 'fewest', label: 'Fewest Games', shortLabel: 'Fewest' },
  { value: 'catchup', label: 'Catch Up', shortLabel: 'Catch Up' },
]

const MODE_DESCRIPTIONS: Record<AutoQueueMode, string> = {
  available: 'Matches from players who are here and not on a court right now.',
  ahead: 'Also uses players who are mid-game. Their matches wait until their current game ends.',
  wait: 'Puts the players who have waited longest since their last game first.',
  fewest: 'Puts the players with the fewest games (played + already queued) first.',
  catchup: 'Helps players who are behind reach a number of games you choose.',
}

const COUNTS: AutoQueueCount[] = [2, 3, 4, 6]

function allDrafts(batches: AutoQueueWorkspaceProps['batches']) {
  return MODE_ITEMS.flatMap(({ value }) => batches[value]?.drafts ?? [])
}

const cardPlayer = (p: AutoQueueDraftPlayer): MatchCardPlayer => ({
  id: p.id,
  name: p.fullName ?? p.name,
  shortName: p.name,
  level: p.level ?? null,
  photoUrl: p.photoUrl,
})

/** Chips under a draft player's name. Zeros are left out; "suggested" only when another draft has them too. */
export function draftPlayerChips(p: AutoQueueDraftPlayer): MatchCardPlayerChip[] {
  return [
    p.played > 0 && { text: `${p.played} played` },
    p.queued > 0 && { text: `${p.queued} queued` },
    p.suggested > 1 && { text: `${p.suggested} suggested` },
    p.playingNow && { text: 'Playing now', tone: 'warn' as const },
  ].filter((chip): chip is MatchCardPlayerChip => Boolean(chip))
}

// "Made 4 of 4 matches." is the normal result: a neutral chip. A shortfall or target note is a notice.
const isFullBatch = (stopReason: string) => {
  const made = /^Made (\d+) of (\d+) matches\.$/.exec(stopReason)
  return Boolean(made && made[1] === made[2])
}

/** The Q-QUEUE / Q-AUTO switch and five independent draft-review tabs. All edits are callbacks. */
export function AutoQueueWorkspace({
  workspace,
  onWorkspaceChange,
  mainQueue,
  mode,
  onModeChange,
  count,
  onCountChange,
  minimumGames,
  hasEligiblePlayers,
  catchUpTarget,
  onCatchUpTargetChange,
  batches,
  selectedIds,
  onSelect,
  onUnselectAll,
  onGenerate,
  onRegenerate,
  onRegenerateUnselected,
  onClear,
  onClearUnselected,
  onAddToMainQueue,
  transferError,
  isPending = false,
  pendingMessage,
  bagging,
}: AutoQueueWorkspaceProps) {
  const hintId = useId()
  const [addPairOpen, setAddPairOpen] = useState(false)
  const [gridRef, columns] = useQueueColumns<HTMLDivElement>(DRAFT_TILE_MIN)
  const [reviewIds, setReviewIds] = useState<string[] | null>(null)
  const reviewErrorRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (transferError && reviewIds !== null) reviewErrorRef.current?.focus()
  }, [transferError, reviewIds])
  const mainQueueRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const batch = batches[mode] ?? { drafts: [] }
  const validTarget = Number.isSafeInteger(Number(catchUpTarget)) && Number(catchUpTarget) > 0
  const canGenerate = count !== null && (mode !== 'catchup' || validTarget)
  const busyHint = `${pendingMessage ?? 'Updating drafts…'} Please wait.`
  const generationHint =
    count === null
      ? 'Choose how many matches first.'
      : mode === 'catchup' && !validTarget
        ? catchUpTarget === ''
          ? 'Choose a game target first.'
          : 'Enter a whole number of games, 1 or more.'
        : ''
  const draftsHint = !batch.drafts.length
    ? 'Generate matches in this tab first to replace or remove drafts, or add them to the Main Queue.'
    : ''
  const generationReason = isPending ? busyHint : generationHint
  const replaceReason = isPending ? busyHint : draftsHint || generationHint
  const clearReason = isPending ? busyHint : draftsHint
  const generationHintId = `${hintId}-${isPending ? 'pending' : 'generation'}`
  const draftsHintId = `${hintId}-${isPending ? 'pending' : 'drafts'}`
  const replaceHintId = draftsHint ? draftsHintId : generationHintId
  const emptyMessage = !hasEligiblePlayers
    ? mode === 'ahead'
      ? 'No present players. Mark arrivals present in Players.'
      : 'No one is free to play right now. Try Plan Ahead to include players who are mid-game.'
    : mode === 'catchup' && !validTarget
      ? 'Choose a game target, then Generate.'
      : count === null
        ? 'Choose how many matches, then Generate.'
        : 'Generate matches to see suggestions here.'
  const drafts = allDrafts(batches)
  // The selection bar's faces: each picked draft's players, in pick order, once each.
  const selectedPlayers = [
    ...new Map(
      selectedIds
        .flatMap((id) => {
          const draft = drafts.find((d) => d.id === id)
          return draft ? [...draft.teamA, ...draft.teamB] : []
        })
        .map((p) => [p.id, { id: p.id, name: p.fullName ?? p.name, photoUrl: p.photoUrl }]),
    ).values(),
  ]
  const selectedDrafts = reviewIds?.map((id) => drafts.find((draft) => draft.id === id)) ?? []
  const reviewChanged =
    reviewIds !== null &&
    (selectedDrafts.some((draft) => !draft) || selectedDrafts.length !== reviewIds.length)

  const reviewHint = isPending
    ? busyHint
    : reviewChanged
      ? 'Drafts changed. Review them again.'
      : !reviewIds?.length
        ? 'Select one or more drafts first to add a selection to the Main Queue.'
        : ''

  return (
    <section
      className="flex min-w-0 flex-col gap-5"
      aria-label="Queue workspace"
      aria-busy={isPending}
    >
      <SegmentedControl
        aria-label="Queue workspace"
        options={[
          { value: 'main', label: 'Main Queue' },
          { value: 'auto', label: 'Generate matches' },
        ]}
        value={workspace}
        onChange={(next) => onWorkspaceChange(next as QueueWorkspace)}
      />
      {workspace === 'main' ? (
        <div ref={mainQueueRef} tabIndex={-1} className="min-w-0 focus:outline-none">
          {mainQueue}
        </div>
      ) : (
        <div className="flex min-w-0 flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <h2 ref={headingRef} tabIndex={-1} className="m-0 text-xl font-bold text-fg">
                Generate matches
              </h2>
              {bagging ? (
                <div className="flex flex-nowrap items-center gap-2 text-[13px] text-fg">
                  <b aria-hidden="true">Bagging mode</b>
                  <Switch
                    aria-label="Bagging mode"
                    checked={bagging.enabled}
                    disabled={isPending}
                    onChange={bagging.onEnabledChange}
                  />
                </div>
              ) : null}
            </div>
            <span className="text-[13px] text-fg2">
              Drafts are suggestions. Nothing joins the Main Queue until you add it.
            </span>
          </div>
          {bagging?.enabled ? (
            <BaggingPairsCard
              pairs={bagging.pairs}
              minimumGames={minimumGames}
              disabled={isPending}
              onAddPair={() => setAddPairOpen(true)}
              onToggleGame={bagging.onToggleGame}
              onRemove={bagging.onRemovePair}
            />
          ) : null}
          <Tabs
            aria-label="Generation strategy"
            items={MODE_ITEMS.map((item) => ({
              ...item,
              badges: batches[item.value]?.drafts.length
                ? [{ text: String(batches[item.value]?.drafts.length) }]
                : undefined,
            }))}
            value={mode}
            onChange={(next) => onModeChange(next as AutoQueueMode)}
          >
            {MODE_ITEMS.map(({ value }) => (
              <TabsContent key={value} value={value} className="flex min-w-0 flex-col gap-4">
                <p className="m-0 text-[13px] text-fg2">{MODE_DESCRIPTIONS[value]}</p>
                <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
                  <legend className="mb-2 text-[13px] font-semibold text-fg2">
                    How many matches?
                  </legend>
                  <div className="flex flex-wrap gap-2">
                    {COUNTS.map((n) => (
                      <Button
                        key={n}
                        size="sm"
                        aria-pressed={count === n}
                        disabled={isPending}
                        title={isPending ? busyHint : undefined}
                        aria-describedby={isPending ? `${hintId}-pending` : undefined}
                        onClick={() => onCountChange(n)}
                        className="min-w-11 tabular-nums"
                      >
                        {n}
                      </Button>
                    ))}
                  </div>
                </fieldset>
                {value === 'catchup' ? (
                  <Field
                    label="Games each player should reach"
                    hint={`Players below this number get matches first. Games already played and games already planned in the Main Queue both count. Earlier drafts in this batch count too. Example: with 3, a player who has played 1 and is queued for 1 needs 1 more match. This is separate from the session minimum (Min ${minimumGames} game${minimumGames === 1 ? '' : 's'}).`}
                    error={
                      catchUpTarget !== '' && !validTarget
                        ? 'Enter a whole number of games, 1 or more.'
                        : undefined
                    }
                  >
                    <TextInput
                      type="number"
                      min={1}
                      step={1}
                      placeholder={`e.g. ${minimumGames}`}
                      value={catchUpTarget}
                      disabled={isPending}
                      invalid={catchUpTarget !== '' && !validTarget}
                      className="max-w-xs"
                      onChange={(event) => onCatchUpTargetChange(event.target.value)}
                    />
                  </Field>
                ) : null}
                {!isPending && generationHint ? (
                  <p id={`${hintId}-generation`} className="m-0 text-[13px] text-fg2">
                    {generationHint}
                  </p>
                ) : null}
                {!isPending && draftsHint ? (
                  <p id={`${hintId}-drafts`} className="m-0 text-[13px] text-fg2">
                    {draftsHint}
                  </p>
                ) : null}
                {/* One primary: Generate, or Generate again once this tab has drafts. The rest is in ⋯. */}
                <div className="flex flex-wrap items-center gap-2">
                  {batch.drafts.length ? (
                    <Button
                      key="again"
                      variant="primary"
                      disabled={!canGenerate || isPending}
                      title={replaceReason || undefined}
                      aria-describedby={replaceReason ? replaceHintId : undefined}
                      onClick={() => {
                        if (count !== null) onRegenerate(mode, count, catchUpTarget)
                      }}
                    >
                      Generate again
                    </Button>
                  ) : (
                    <Button
                      key="generate"
                      variant="primary"
                      disabled={!canGenerate || isPending}
                      title={generationReason || undefined}
                      aria-describedby={generationReason ? generationHintId : undefined}
                      onClick={() => {
                        if (count !== null) onGenerate(mode, count, catchUpTarget)
                      }}
                    >
                      {count === null ? 'Generate matches' : `Generate ${count} matches`}
                    </Button>
                  )}
                  {batch.drafts.length ? (
                    <OverflowMenu
                      label="More draft actions"
                      align="start"
                      items={[
                        {
                          label: 'Replace unselected',
                          description:
                            'Keeps the drafts you picked and makes new ones for the rest.',
                          disabledReason: replaceReason || undefined,
                          onSelect: () => {
                            if (count !== null) onRegenerateUnselected(mode, count, catchUpTarget)
                          },
                        },
                        {
                          label: 'Remove unselected',
                          description: 'Keeps only the drafts you picked.',
                          disabledReason: clearReason || undefined,
                          onSelect: () => {
                            onClearUnselected(mode)
                            headingRef.current?.focus()
                          },
                        },
                        {
                          label: 'Clear this tab',
                          description: 'Removes every draft in this tab.',
                          disabledReason: clearReason || undefined,
                          destructive: true,
                          onSelect: () => {
                            onClear(mode)
                            headingRef.current?.focus()
                          },
                        },
                      ]}
                    />
                  ) : null}
                </div>
                {isPending ? (
                  <div id={`${hintId}-pending`}>
                    <Notice tone="info">{busyHint}</Notice>
                  </div>
                ) : null}
                {batch.error ? <Notice tone="error">{batch.error}</Notice> : null}
                {batch.stale ? (
                  <Notice tone="warn">
                    The Main Queue changed since these were made. Check them before adding, or
                    generate again.
                  </Notice>
                ) : null}
                {batch.stopReason ? (
                  isFullBatch(batch.stopReason) ? (
                    <div>
                      <Chip>{batch.stopReason}</Chip>
                    </div>
                  ) : (
                    <Notice tone="info">{batch.stopReason}</Notice>
                  )
                ) : null}
                {batch.drafts.length ? (
                  <div
                    ref={gridRef}
                    className="grid min-w-0 gap-2.5"
                    style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
                  >
                    {batch.drafts.map((draft, i) => {
                      const pick = selectedIds.indexOf(draft.id) + 1
                      return (
                        <MatchCard
                          key={draft.id}
                          position={i + 1}
                          matchNo={i + 1}
                          format={draft.format}
                          origin="auto"
                          manualProtected={false}
                          status={
                            draft.attentionReason
                              ? { kind: 'needs-attention', reason: draft.attentionReason }
                              : { kind: 'blocked', reason: draft.blockedReason ?? draft.reason }
                          }
                          teamA={draft.teamA.map(cardPlayer)}
                          teamB={draft.teamB.map(cardPlayer)}
                          draft={{
                            selected: pick > 0,
                            pickOrder: pick || undefined,
                            disabled: isPending,
                            onToggle: () => onSelect(draft.id, pick === 0),
                            playerChips: Object.fromEntries(
                              [...draft.teamA, ...draft.teamB].map((p) => [
                                p.id,
                                draftPlayerChips(p),
                              ]),
                            ),
                          }}
                        />
                      )
                    })}
                  </div>
                ) : isPending ||
                  (hasEligiblePlayers && (batch.stopReason || batch.error)) ? null : (
                  <Card className="text-center text-fg2">{emptyMessage}</Card>
                )}
                {selectedIds.length || batch.drafts.length ? (
                  <SelectionBar
                    ariaLabel="Selected drafts"
                    players={selectedPlayers}
                    count={selectedIds.length}
                    label={
                      selectedIds.length
                        ? 'added in the order you picked'
                        : 'tap drafts to pick them'
                    }
                    valid={selectedIds.length > 0 && !isPending}
                    onClear={onUnselectAll}
                    primaryLabel={`Add ${selectedIds.length} to Main Queue`}
                    onMakeMatch={() => setReviewIds([...selectedIds])}
                    actions={
                      batch.drafts.length ? (
                        <Button
                          size="sm"
                          disabled={isPending}
                          title={isPending ? busyHint : undefined}
                          onClick={() => setReviewIds(batch.drafts.map((draft) => draft.id))}
                        >
                          Add all {batch.drafts.length}
                        </Button>
                      ) : null
                    }
                  />
                ) : null}
              </TabsContent>
            ))}
          </Tabs>
        </div>
      )}
      {bagging ? (
        <BaggingPairSheet
          open={addPairOpen}
          onOpenChange={setAddPairOpen}
          players={bagging.players}
          pairs={bagging.pairs}
          minimumGames={minimumGames}
          isPending={isPending}
          onAdd={async (pair) => {
            if ((await bagging.onAddPair(pair)) !== false) setAddPairOpen(false)
          }}
        />
      ) : null}
      <Sheet
        open={reviewIds !== null}
        onOpenChange={(open) => {
          if (!open && !isPending) setReviewIds(null)
        }}
        title="Add selected to Main Queue?"
        dismissible={!isPending}
        returnFocusRef={mainQueueRef}
        footer={
          <>
            <Button
              disabled={isPending}
              title={isPending ? busyHint : undefined}
              aria-describedby={isPending ? `${hintId}-review` : undefined}
              onClick={() => setReviewIds(null)}
            >
              Back
            </Button>
            <Button
              variant="primary"
              disabled={!reviewIds?.length || reviewChanged || isPending}
              title={reviewHint || undefined}
              aria-describedby={reviewHint ? `${hintId}-review` : undefined}
              onClick={async () => {
                if (reviewIds && (await onAddToMainQueue(reviewIds)) !== false) setReviewIds(null)
              }}
            >
              Add to Main Queue
            </Button>
          </>
        }
      >
        {reviewHint ? (
          <p id={`${hintId}-review`} className="m-0 text-[13px] text-fg2">
            {reviewHint}
          </p>
        ) : null}
        <p className="m-0 text-[13px] text-fg2">
          Matches are added in the order you picked them. We check them again before adding.
        </p>
        {transferError ? (
          <div ref={reviewErrorRef} tabIndex={-1} className="focus:outline-none">
            <Notice tone="error">{transferError}</Notice>
          </div>
        ) : null}
        {reviewChanged ? <Notice tone="warn">Drafts changed. Review them again.</Notice> : null}
        <ol className="space-y-2 pl-5 text-fg">
          {selectedDrafts.map((draft) =>
            draft ? (
              <li key={draft.id}>
                {draft.teamA.map((player) => player.name).join(' and ')} vs{' '}
                {draft.teamB.map((player) => player.name).join(' and ')}
              </li>
            ) : null,
          )}
        </ol>
      </Sheet>
    </section>
  )
}
