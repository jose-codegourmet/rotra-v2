'use client'

import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { Checkbox } from '@rotra/ui/checkbox'
import { Field } from '@rotra/ui/field'
import { Notice } from '@rotra/ui/notice'
import { SegmentedControl } from '@rotra/ui/segmented-control'
import { Sheet } from '@rotra/ui/sheet'
import { Tabs, TabsContent } from '@rotra/ui/tabs'
import { TextInput } from '@rotra/ui/text-input'
import { type ReactNode, useEffect, useId, useRef, useState } from 'react'

export type AutoQueueMode = 'available' | 'ahead' | 'wait' | 'fewest' | 'catchup'
export type AutoQueueCount = 2 | 3 | 4 | 6
export type QueueWorkspace = 'main' | 'auto'

export type AutoQueueDraftPlayer = {
  id: string
  name: string
  played: number
  queued: number
  suggested: number
  /** A temporary dependency: this player is in a match now. */
  playingNow?: boolean
}

export type AutoQueueDraft = {
  id: string
  format: string
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
  onGenerate,
  onRegenerate,
  onRegenerateUnselected,
  onClear,
  onClearUnselected,
  onAddToMainQueue,
  transferError,
  isPending = false,
  pendingMessage,
}: AutoQueueWorkspaceProps) {
  const hintId = useId()
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
  const selectionHint = !selectedIds.length
    ? 'Select one or more drafts first to add a selection to the Main Queue.'
    : ''
  const generationReason = isPending ? busyHint : generationHint
  const replaceReason = isPending ? busyHint : draftsHint || generationHint
  const clearReason = isPending ? busyHint : draftsHint
  const selectionReason = isPending ? busyHint : selectionHint
  const generationHintId = `${hintId}-${isPending ? 'pending' : 'generation'}`
  const draftsHintId = `${hintId}-${isPending ? 'pending' : 'drafts'}`
  const replaceHintId = draftsHint ? draftsHintId : generationHintId
  const selectionHintId = `${hintId}-${isPending ? 'pending' : 'selection'}`
  const emptyMessage = !hasEligiblePlayers
    ? mode === 'ahead'
      ? 'No present players. Mark arrivals present in Players.'
      : 'No one is free to play right now. Try Plan Ahead to include players who are mid-game.'
    : mode === 'catchup' && !validTarget
      ? 'Choose a game target, then Generate.'
      : count === null
        ? 'Choose how many matches, then Generate.'
        : 'Generate matches to see suggestions here.'
  const selectedDrafts =
    reviewIds?.map((id) => allDrafts(batches).find((draft) => draft.id === id)) ?? []
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
          { value: 'auto', label: 'Auto Queue' },
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
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 ref={headingRef} tabIndex={-1} className="m-0 text-xl font-bold text-fg">
              Auto Queue
            </h2>
            <span className="text-[13px] text-fg2">
              Drafts are suggestions. Nothing joins the Main Queue until you add it.
            </span>
          </div>
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
                <div className="grid grid-cols-2 gap-2 min-[640px]:flex min-[640px]:flex-wrap [&>button]:min-w-0 [&>button]:whitespace-normal [&>button]:py-2">
                  <Button
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
                  <Button
                    disabled={!batch.drafts.length || !canGenerate || isPending}
                    title={replaceReason || undefined}
                    aria-describedby={replaceReason ? replaceHintId : undefined}
                    onClick={() => {
                      if (count !== null) onRegenerate(mode, count, catchUpTarget)
                    }}
                  >
                    Generate again
                  </Button>
                  <Button
                    disabled={!batch.drafts.length || !canGenerate || isPending}
                    title={replaceReason || undefined}
                    aria-describedby={replaceReason ? replaceHintId : undefined}
                    onClick={() => {
                      if (count !== null) onRegenerateUnselected(mode, count, catchUpTarget)
                    }}
                  >
                    Replace unselected
                  </Button>
                  <Button
                    disabled={!batch.drafts.length || isPending}
                    title={clearReason || undefined}
                    aria-describedby={clearReason ? draftsHintId : undefined}
                    onClick={() => {
                      onClearUnselected(mode)
                      headingRef.current?.focus()
                    }}
                  >
                    Remove unselected
                  </Button>
                  <Button
                    disabled={!batch.drafts.length || isPending}
                    title={clearReason || undefined}
                    aria-describedby={clearReason ? draftsHintId : undefined}
                    onClick={() => {
                      onClear(mode)
                      headingRef.current?.focus()
                    }}
                  >
                    Clear this tab
                  </Button>
                </div>
                <p className="m-0 text-[13px] text-fg2">
                  Generate again replaces every draft in this tab. Replace unselected keeps the ones
                  you picked. Remove unselected removes the others.
                </p>
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
                  <p className="m-0 text-[13px] text-fg2">{batch.stopReason}</p>
                ) : null}
                {batch.drafts.length ? (
                  <div className="grid min-w-0 gap-3 lg:grid-cols-2">
                    {batch.drafts.map((draft) => (
                      <Card key={draft.id} asChild>
                        <article className="flex min-w-0 flex-col gap-3">
                          <Checkbox
                            label={`Select ${draft.format}`}
                            checked={selectedIds.includes(draft.id)}
                            disabled={isPending}
                            aria-describedby={isPending ? `${hintId}-pending` : undefined}
                            onChange={(selected) => onSelect(draft.id, selected)}
                          />
                          <p className="m-0 font-semibold text-fg">
                            {draft.teamA.map((player) => player.name).join(' and ')} vs{' '}
                            {draft.teamB.map((player) => player.name).join(' and ')}
                          </p>
                          <p className="m-0 text-[13px] text-fg2">
                            {MODE_ITEMS.find((item) => item.value === value)?.label} ·{' '}
                            {draft.reason}
                          </p>
                          <ul className="m-0 list-none space-y-1 p-0 text-[13px] text-fg2">
                            {[...draft.teamA, ...draft.teamB].map((player) => (
                              <li key={player.id}>
                                {player.name}: {player.played} played, {player.queued} queued,{' '}
                                {player.suggested} suggested
                                {player.playingNow ? ', playing now' : ''}
                              </li>
                            ))}
                          </ul>
                          {draft.blockedReason ? (
                            <Notice tone="info">{draft.blockedReason}</Notice>
                          ) : null}
                          {draft.attentionReason ? (
                            <Notice tone="warn">{draft.attentionReason}</Notice>
                          ) : null}
                        </article>
                      </Card>
                    ))}
                  </div>
                ) : isPending ||
                  (hasEligiblePlayers && (batch.stopReason || batch.error)) ? null : (
                  <Card className="text-center text-fg2">{emptyMessage}</Card>
                )}
                <div className="grid grid-cols-1 gap-2 min-[640px]:flex min-[640px]:flex-wrap">
                  <Button
                    variant="primary"
                    disabled={!selectedIds.length || isPending}
                    title={selectionReason || undefined}
                    aria-describedby={selectionReason ? selectionHintId : undefined}
                    onClick={() => setReviewIds([...selectedIds])}
                  >
                    Add {selectedIds.length} selected to Main Queue
                  </Button>
                  <Button
                    disabled={!batch.drafts.length || isPending}
                    title={clearReason || undefined}
                    aria-describedby={clearReason ? draftsHintId : undefined}
                    onClick={() => setReviewIds(batch.drafts.map((draft) => draft.id))}
                  >
                    Add all {batch.drafts.length} to Main Queue
                  </Button>
                </div>
                {!isPending && selectionHint ? (
                  <p id={`${hintId}-selection`} className="m-0 text-[13px] text-fg2">
                    {selectionHint}
                  </p>
                ) : null}
              </TabsContent>
            ))}
          </Tabs>
        </div>
      )}
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
