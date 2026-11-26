'use client'

import type { BaggingGames } from '@rotra/data/match/auto-queue-types'
import { PLAN_AHEAD_DESCRIPTION } from '@rotra/data/match/plan-ahead-rules'
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
import { cn } from '@rotra/ui/cn'
import { ExemptionListCard } from '@rotra/ui/exemption-list-card'
import { Field } from '@rotra/ui/field'
import { MatchCard, type MatchCardPlayer } from '@rotra/ui/match-card'
import { Notice } from '@rotra/ui/notice'
import { OverflowMenu } from '@rotra/ui/overflow-menu'
import type { ExemptionPlayer } from '@rotra/ui/player-picker-sheet'
import { SelectionBar } from '@rotra/ui/selection-bar'
import { Sheet } from '@rotra/ui/sheet'
import { Switch } from '@rotra/ui/switch'
import { Tabs, TabsContent } from '@rotra/ui/tabs'
import { TextInput } from '@rotra/ui/text-input'
import { useEffect, useId, useRef, useState } from 'react'

export type AutoQueueMode = 'available' | 'ahead' | 'wait' | 'fewest' | 'catchup'
export type AutoQueueCount = 2 | 3 | 4 | 6

export type AutoQueueDraftPlayer = {
  id: string
  /** Nickname or first name, under the picture */
  name: string
  /** Full name for the picture's title; falls back to name */
  fullName?: string
  level?: PlayingLevel | null
  photoUrl?: string
  /** Games counted this session: the badge on the picture's ring (opens the games dialog) */
  games: number
}

export type AutoQueueDraft = {
  id: string
  format: MatchFormat
  teamA: AutoQueueDraftPlayer[]
  teamB: AutoQueueDraftPlayer[]
  /**
   * The status line: "Waits for Court 2 · ends in about 3 min" while a player is on a court, the
   * draft's own reason otherwise. Drafts can be picked either way.
   */
  reason: string
  /** 'warn' when the awaited match runs long; default muted */
  statusTone?: 'muted' | 'warn'
  /** Category prefix of the format chip: "Mixed", "Men's", "Women's" or "Genderless" */
  categoryPrefix?: string
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

/**
 * The Exemption list (Q27.4): the players Generate Queue leaves out, shown as a card in the side column.
 * Leave the prop out to hide the card. Persisting the list and filtering generation are the container's.
 */
export type AutoQueueExemptionProps = {
  /** Every roster player: the picker's tiles and the chips */
  players: ExemptionPlayer[]
  /** The saved list */
  exemptIds: string[]
  /** "Save list · N" in the picker, or a chip's ×; an empty list clears it */
  onSave: (ids: string[]) => void
}

export type AutoQueueWorkspaceProps = {
  mode: AutoQueueMode
  onModeChange: (mode: AutoQueueMode) => void
  count: AutoQueueCount | null
  onCountChange: (count: AutoQueueCount) => void
  minimumGames: number
  /**
   * Why this tab has nobody to draw from (autoQueueEmptyText), or null when someone can be used.
   * Shown in the empty card; "nobody present" and "nobody free" read differently in Plan Ahead.
   */
  noEligibleText: string | null
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
  /** Exemption list card (side column, below Bagging pairs); omitted to hide it */
  exemption?: AutoQueueExemptionProps
  /** Opens "NAME's games" from a draft face's games badge (the roster player id) */
  onOpenGames?: (playerId: string) => void
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
  ahead: PLAN_AHEAD_DESCRIPTION,
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
  games: p.games,
})

// "Made 4 of 4 matches." is the normal result: a neutral chip. A shortfall or target note is a notice.
const isFullBatch = (stopReason: string) => {
  const made = /^Made (\d+) of (\d+) matches\.$/.exec(stopReason)
  return Boolean(made && made[1] === made[2])
}

/** The Generate Queue tab (Q-AUTO): five independent draft-review tabs. All edits are callbacks. */
export function AutoQueueWorkspace({
  mode,
  onModeChange,
  count,
  onCountChange,
  minimumGames,
  noEligibleText,
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
  exemption,
  onOpenGames,
}: AutoQueueWorkspaceProps) {
  const hintId = useId()
  const hasSide = Boolean(bagging?.enabled || exemption)
  const [addPairOpen, setAddPairOpen] = useState(false)
  const [reviewIds, setReviewIds] = useState<string[] | null>(null)
  const reviewErrorRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (transferError && reviewIds !== null) reviewErrorRef.current?.focus()
  }, [transferError, reviewIds])
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
  const hasEligiblePlayers = noEligibleText === null
  const emptyMessage = noEligibleText
    ? noEligibleText
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
      aria-label="Generate Queue"
      aria-busy={isPending}
    >
      <div className="flex min-w-0 flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <h2 ref={headingRef} tabIndex={-1} className="m-0 text-xl font-bold text-fg">
              Generate Queue
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
        <div
          className={cn(
            'grid min-w-0 grid-cols-1 items-start gap-5',
            hasSide && 'min-[1280px]:grid-cols-[minmax(0,1fr)_minmax(300px,360px)]',
          )}
        >
          {hasSide ? (
            <aside
              aria-label="Who Generate Queue uses"
              className="order-first flex min-w-0 flex-col gap-3.5 min-[1280px]:order-none min-[1280px]:col-start-2 min-[1280px]:row-start-1"
            >
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
              {exemption ? (
                <ExemptionListCard
                  players={exemption.players}
                  exemptIds={exemption.exemptIds}
                  disabled={isPending}
                  onSave={exemption.onSave}
                />
              ) : null}
            </aside>
          ) : null}
          <Card
            asChild
            className="flex min-w-0 flex-col gap-3.5 p-4 min-[1280px]:col-start-1 min-[1280px]:row-start-1"
          >
            <section aria-label="Generate matches">
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
                                if (count !== null)
                                  onRegenerateUnselected(mode, count, catchUpTarget)
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
                      <div className="grid min-w-0 grid-cols-[repeat(auto-fill,minmax(min(100%,230px),1fr))] gap-2.5">
                        {batch.drafts.map((draft, i) => {
                          const pick = selectedIds.indexOf(draft.id) + 1
                          return (
                            <MatchCard
                              key={draft.id}
                              position={i + 1}
                              matchNo={i + 1}
                              format={draft.format}
                              categoryPrefix={draft.categoryPrefix}
                              origin="auto"
                              manualProtected={false}
                              status={
                                draft.attentionReason
                                  ? { kind: 'needs-attention', reason: draft.attentionReason }
                                  : { kind: 'blocked', reason: draft.reason }
                              }
                              teamA={draft.teamA.map(cardPlayer)}
                              teamB={draft.teamB.map(cardPlayer)}
                              onOpenGames={onOpenGames}
                              draft={{
                                statusTone: draft.statusTone,
                                selected: pick > 0,
                                pickOrder: pick || undefined,
                                disabled: isPending,
                                onToggle: () => onSelect(draft.id, pick === 0),
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
            </section>
          </Card>
        </div>
      </div>
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
        returnFocusRef={headingRef}
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
