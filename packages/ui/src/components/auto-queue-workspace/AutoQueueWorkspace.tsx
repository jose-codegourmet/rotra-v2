'use client'

import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { Checkbox } from '@rotra/ui/checkbox'
import { Notice } from '@rotra/ui/notice'
import { SegmentedControl } from '@rotra/ui/segmented-control'
import { Sheet } from '@rotra/ui/sheet'
import { Tabs, TabsContent } from '@rotra/ui/tabs'
import { TextInput } from '@rotra/ui/text-input'
import { type ReactNode, useRef, useState } from 'react'

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
}

const MODE_ITEMS: { value: AutoQueueMode; label: string; shortLabel: string }[] = [
  { value: 'available', label: 'Available Players', shortLabel: 'Available' },
  { value: 'ahead', label: 'Plan Ahead', shortLabel: 'Ahead' },
  { value: 'wait', label: 'Longest Wait', shortLabel: 'Wait' },
  { value: 'fewest', label: 'Fewest Games', shortLabel: 'Fewest' },
  { value: 'catchup', label: 'Catch Up', shortLabel: 'Catch Up' },
]

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
}: AutoQueueWorkspaceProps) {
  const [reviewIds, setReviewIds] = useState<string[] | null>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const batch = batches[mode] ?? { drafts: [] }
  const canGenerate = count !== null && (mode !== 'catchup' || Number(catchUpTarget) > 0)
  const selectedDrafts =
    reviewIds?.map((id) => allDrafts(batches).find((draft) => draft.id === id)) ?? []
  const reviewChanged =
    selectedDrafts.some((draft) => !draft) || selectedDrafts.length !== reviewIds?.length

  return (
    <section className="flex min-w-0 flex-col gap-5" aria-label="Queue workspace">
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
        mainQueue
      ) : (
        <div className="flex min-w-0 flex-col gap-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 ref={headingRef} tabIndex={-1} className="m-0 text-xl font-bold text-fg">
              Auto Queue
            </h2>
            <span className="text-[13px] text-fg2">Drafts are not waiting matches</span>
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
                <p className="m-0 text-[13px] text-fg2">
                  {value === 'ahead'
                    ? 'Includes present players who are still playing; those lineups wait until they are free.'
                    : value === 'catchup'
                      ? 'Choose a target for completed games. Planned games do not count as played.'
                      : 'Uses present players who are not currently playing.'}
                </p>
                <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
                  <legend className="mb-2 text-[13px] font-semibold text-fg2">
                    Number of matches
                  </legend>
                  <div className="flex flex-wrap gap-2">
                    {COUNTS.map((n) => (
                      <Button
                        key={n}
                        size="sm"
                        aria-pressed={count === n}
                        disabled={isPending}
                        onClick={() => onCountChange(n)}
                        className="min-w-11 tabular-nums"
                      >
                        {n}
                      </Button>
                    ))}
                  </div>
                </fieldset>
                {value === 'catchup' ? (
                  <label
                    htmlFor="auto-queue-catch-up-target"
                    className="flex max-w-xs flex-col gap-1.5 text-[13px] font-semibold text-fg2"
                  >
                    Catch Up target
                    <TextInput
                      id="auto-queue-catch-up-target"
                      type="number"
                      min={1}
                      step={1}
                      value={catchUpTarget}
                      disabled={isPending}
                      onChange={(event) => onCatchUpTargetChange(event.target.value)}
                    />
                  </label>
                ) : null}
                <div className="grid grid-cols-2 gap-2 min-[640px]:flex min-[640px]:flex-wrap">
                  <Button
                    variant="primary"
                    disabled={!canGenerate || isPending}
                    onClick={() => {
                      if (count !== null) onGenerate(mode, count, catchUpTarget)
                    }}
                  >
                    Generate
                  </Button>
                  <Button
                    disabled={!batch.drafts.length || !canGenerate || isPending}
                    onClick={() => {
                      if (count !== null) onRegenerate(mode, count, catchUpTarget)
                    }}
                  >
                    Regenerate
                  </Button>
                  <Button
                    disabled={!batch.drafts.length || !canGenerate || isPending}
                    onClick={() => {
                      if (count !== null) onRegenerateUnselected(mode, count, catchUpTarget)
                    }}
                  >
                    Regenerate unselected
                  </Button>
                  <Button
                    disabled={!batch.drafts.length || isPending}
                    onClick={() => {
                      onClearUnselected(mode)
                      headingRef.current?.focus()
                    }}
                  >
                    Clear unselected
                  </Button>
                  <Button
                    disabled={!batch.drafts.length || isPending}
                    onClick={() => {
                      onClear(mode)
                      headingRef.current?.focus()
                    }}
                  >
                    Clear tab
                  </Button>
                </div>
                {batch.error ? <Notice tone="error">{batch.error}</Notice> : null}
                {batch.stale ? (
                  <Notice tone="warn">
                    Main Queue changed since generation. Drafts are stale; review and revalidate
                    before adding.
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
                ) : (
                  <Card className="text-center text-fg2">
                    No drafts in this tab. Choose a count and generate.
                  </Card>
                )}
                <div className="grid grid-cols-1 gap-2 min-[640px]:flex min-[640px]:flex-wrap">
                  <Button
                    variant="primary"
                    disabled={!selectedIds.length || isPending}
                    onClick={() => setReviewIds([...selectedIds])}
                  >
                    Add selected to Main Queue ({selectedIds.length})
                  </Button>
                  <Button
                    disabled={!batch.drafts.length || isPending}
                    onClick={() => setReviewIds(batch.drafts.map((draft) => draft.id))}
                  >
                    Add all from this tab
                  </Button>
                </div>
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
        footer={
          <>
            <Button disabled={isPending} onClick={() => setReviewIds(null)}>
              Back
            </Button>
            <Button
              variant="primary"
              disabled={!reviewIds?.length || reviewChanged || isPending}
              onClick={async () => {
                if (reviewIds && await onAddToMainQueue(reviewIds) !== false) setReviewIds(null)
              }}
            >
              Add to Main Queue
            </Button>
          </>
        }
      >
        <p className="m-0 text-[13px] text-fg2">
          Transfer order follows your selection. Drafts are revalidated when added.
        </p>
        {transferError ? <Notice tone="error">{transferError}</Notice> : null}
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
