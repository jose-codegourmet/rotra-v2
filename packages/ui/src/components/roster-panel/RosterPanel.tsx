'use client'

import type { PlayingLevel } from '@rotra/data/player/types'
import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { Chip } from '@rotra/ui/chip'
import { cn } from '@rotra/ui/cn'
import { EmptyState } from '@rotra/ui/empty-state'
import { Icon } from '@rotra/ui/icon'
import type { Identity } from '@rotra/ui/identity-chip/variants'
import { Notice } from '@rotra/ui/notice'
import { RosterCard } from '@rotra/ui/roster-card'
import { RosterRow } from '@rotra/ui/roster-row'
import { SegmentedControl } from '@rotra/ui/segmented-control'
import { Select } from '@rotra/ui/select'
import { Skeleton } from '@rotra/ui/skeleton'
import { SkillDistributionBar } from '@rotra/ui/skill-distribution-bar'
import { SlotMeter } from '@rotra/ui/slot-meter'
import { Tabs as TabsPrimitive } from 'radix-ui'
import { useId, useState } from 'react'
import {
  filterRosterByLevelTab,
  groupRosterPlayers,
  type RosterGroupBy,
  type RosterLevelTab,
  type RosterView,
  resolveRosterGroupBy,
  resolveRosterLevelTab,
  rosterGroupByOptions,
  rosterLevelTabs,
} from './RosterPanel.helpers'

export type { RosterGroupBy, RosterLevelTab, RosterView }

/** One roster slot with the saved-player details a RosterRow or RosterCard needs */
export type RosterPanelPlayer = {
  /** The session player's id, passed back through the callbacks */
  id: string
  name: string
  photoUrl?: string
  identity: Identity
  suggestion: PlayingLevel | null
  level: PlayingLevel | null
  present: boolean
  presencePending?: boolean
  /** Payment mark for this session; omitted until the screen wires it */
  paid?: boolean
  /** Played a session at this club before; omitted until the Returning flag is wired */
  returning?: boolean
}

export type RosterPanelProps = {
  players: RosterPanelPlayer[]
  /** Slot budget: courts × players per court */
  capacity: number
  waitlistCount?: number
  /** Levels lock when the session starts */
  levelsLocked?: boolean
  /** The roster is still loading: Skeleton rows in place of the list, meter and actions */
  loading?: boolean
  /** Active settings summary: locked levels and presence text, with Add player only. */
  readOnly?: boolean
  /** Controlled level tab; omit to keep the choice on this component */
  levelTab?: RosterLevelTab
  onLevelTabChange?: (tab: RosterLevelTab) => void
  /** Controlled Group by; omit to keep the choice on this component */
  groupBy?: RosterGroupBy
  onGroupByChange?: (groupBy: RosterGroupBy) => void
  /** Controlled List | Grid; omit to keep the choice on this component */
  view?: RosterView
  onViewChange?: (view: RosterView) => void
  onMarkAllPresent: () => void
  onMarkAllAbsent: () => void
  onAddPlayer: () => void
  onOpenProfile: (playerId: string) => void
  onLevelChange: (playerId: string, level: PlayingLevel) => void
  onPresentChange: (playerId: string, present: boolean) => void
  onRemove: (playerId: string) => void
  className?: string
}

/** Three placeholder rows shaped like RosterRow: picture, two text lines, a level and a switch. */
function RosterSkeletonRows() {
  return (
    <div className="flex flex-col divide-y divide-border">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="grid min-w-0 grid-cols-1 gap-2 py-2.5 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] sm:items-center sm:gap-3"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-full" />
            <span className="flex flex-1 flex-col gap-1.5">
              <Skeleton className="w-36" />
              <Skeleton className="h-3 w-44" />
            </span>
          </div>
          <Skeleton className="h-11 w-full rounded-md sm:w-48" />
          <Skeleton className="h-8 w-[54px] rounded-full" />
        </div>
      ))}
    </div>
  )
}

function PlayerList({
  players,
  view,
  levelsLocked,
  readOnly,
  onOpenProfile,
  onLevelChange,
  onPresentChange,
  onRemove,
}: {
  players: RosterPanelPlayer[]
  view: RosterView
  levelsLocked?: boolean
  readOnly?: boolean
  onOpenProfile: (playerId: string) => void
  onLevelChange: (playerId: string, level: PlayingLevel) => void
  onPresentChange: (playerId: string, present: boolean) => void
  onRemove: (playerId: string) => void
}) {
  if (view === 'grid') {
    return (
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,220px),1fr))] gap-2.5">
        {players.map((p) => (
          <RosterCard
            key={p.id}
            name={p.name}
            photoUrl={p.photoUrl}
            identity={p.identity}
            suggestion={p.suggestion}
            level={p.level}
            present={p.present}
            presencePending={p.presencePending}
            paid={p.paid}
            levelLocked={levelsLocked}
            readOnly={readOnly}
            onOpenProfile={() => onOpenProfile(p.id)}
            onLevelChange={(level) => onLevelChange(p.id, level)}
            onPresentChange={(present) => onPresentChange(p.id, present)}
            onRemove={() => onRemove(p.id)}
          />
        ))}
      </div>
    )
  }
  return (
    <div className="flex flex-col divide-y divide-border">
      {players.map((p) => (
        <RosterRow
          key={p.id}
          name={p.name}
          photoUrl={p.photoUrl}
          identity={p.identity}
          suggestion={p.suggestion}
          level={p.level}
          present={p.present}
          presencePending={p.presencePending}
          levelLocked={levelsLocked}
          readOnly={readOnly}
          onOpenProfile={() => onOpenProfile(p.id)}
          onLevelChange={(level) => onLevelChange(p.id, level)}
          onPresentChange={(present) => onPresentChange(p.id, present)}
          onRemove={() => onRemove(p.id)}
        />
      ))}
    </div>
  )
}

/**
 * The preparation "Roster and levels" panel: heading and actions, the SlotMeter, the missing-level
 * warning, level tabs, Group by, List | Grid, and one RosterRow or RosterCard per confirmed slot,
 * or the empty line when nobody has a slot yet. While loading it shows the heading and Skeleton
 * rows, never fake names.
 */
export function RosterPanel({
  players,
  capacity,
  waitlistCount,
  levelsLocked,
  loading = false,
  readOnly = false,
  levelTab: levelTabProp,
  onLevelTabChange,
  groupBy: groupByProp,
  onGroupByChange,
  view: viewProp,
  onViewChange,
  onMarkAllPresent,
  onMarkAllAbsent,
  onAddPlayer,
  onOpenProfile,
  onLevelChange,
  onPresentChange,
  onRemove,
  className,
}: RosterPanelProps) {
  const headingId = useId()
  const [levelTabState, setLevelTabState] = useState<RosterLevelTab>('all')
  const [groupByState, setGroupByState] = useState<RosterGroupBy>('none')
  const [viewState, setViewState] = useState<RosterView>('list')
  const requestedTab = levelTabProp ?? levelTabState
  const requestedGroupBy = groupByProp ?? groupByState
  const view = viewProp ?? viewState
  const setLevelTab = (tab: RosterLevelTab) => {
    onLevelTabChange?.(tab)
    if (levelTabProp === undefined) setLevelTabState(tab)
  }
  const setGroupBy = (next: RosterGroupBy) => {
    onGroupByChange?.(next)
    if (groupByProp === undefined) setGroupByState(next)
  }
  const setView = (next: RosterView) => {
    onViewChange?.(next)
    if (viewProp === undefined) setViewState(next)
  }

  const missing = players.filter((p) => p.level === null).length
  const someoneAbsent = players.some((p) => !p.present)
  const someonePresent = players.some((p) => p.present)
  const tabs = rosterLevelTabs(players)
  const tab = resolveRosterLevelTab(requestedTab, tabs)
  const groupBy = resolveRosterGroupBy(requestedGroupBy, tab)
  const groupOptions = rosterGroupByOptions(tab)
  const rows = filterRosterByLevelTab(players, tab)
  const sections = groupRosterPlayers(rows, groupBy)
  const skillCount = (heading: string) =>
    sections?.find((section) => section.heading === heading)?.players.length ?? 0
  const tabLabel = tabs.find((item) => item.value === tab)?.label ?? 'All'

  if (loading)
    return (
      <Card asChild className={cn('flex flex-col gap-3', className)}>
        <section aria-busy aria-label="Loading the roster">
          <div>
            <h2 className="text-lg font-bold">Roster and levels</h2>
            <p className="text-[13px] text-fg2">
              {readOnly
                ? 'Fixed after start: playing levels. Manage presence in the live Players view.'
                : "Confirm each player's slot and set their level for this club. Levels lock when the session starts."}
            </p>
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
          <RosterSkeletonRows />
        </section>
      </Card>
    )
  return (
    <Card asChild className={cn('flex flex-col gap-3', className)}>
      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">Roster and levels</h2>
            <p className="text-[13px] text-fg2">
              {readOnly
                ? 'Fixed after start: playing levels. Manage presence in the live Players view.'
                : "Confirm each player's slot and set their level for this club. Levels lock when the session starts."}
            </p>
          </div>
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
            {!readOnly && someoneAbsent ? (
              <Button size="sm" onClick={onMarkAllPresent} className="w-full sm:w-auto">
                Mark all present
              </Button>
            ) : null}
            {!readOnly && someonePresent ? (
              <Button size="sm" onClick={onMarkAllAbsent} className="w-full sm:w-auto">
                Mark all absent
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="primary"
              onClick={onAddPlayer}
              // The prototype's .acts: an odd last button spans both phone columns
              className={cn(
                'w-full sm:w-auto',
                (readOnly || someoneAbsent === someonePresent) && 'col-span-2',
              )}
            >
              Add player
            </Button>
          </div>
        </div>
        <SlotMeter
          live={Boolean(levelsLocked || readOnly)}
          rosterCount={players.length}
          capacity={capacity}
          waitlistCount={waitlistCount}
        />
        {!readOnly && missing ? (
          <Notice tone="warn">
            {missing} player{missing > 1 ? 's need' : ' needs'} a level before the session can
            start.
          </Notice>
        ) : null}
        {players.length ? (
          <>
            <TabsPrimitive.Root
              value={tab}
              onValueChange={(value) => setLevelTab(value as RosterLevelTab)}
            >
              <TabsPrimitive.List
                aria-label="Levels"
                className="flex gap-1 overflow-x-auto border-b border-border"
              >
                {tabs.map((item) => (
                  <TabsPrimitive.Trigger
                    key={item.value}
                    value={item.value}
                    className={cn(
                      'inline-flex shrink-0 items-center gap-1.5 border-0 border-b-2 border-transparent bg-transparent px-3 py-2.5 font-bold whitespace-nowrap text-fg2',
                      'hover:text-fg data-[state=active]:border-accent data-[state=active]:text-fg',
                      'disabled:cursor-not-allowed disabled:opacity-45 touch:min-h-12',
                    )}
                  >
                    {item.label} <Chip>{item.count}</Chip>
                  </TabsPrimitive.Trigger>
                ))}
              </TabsPrimitive.List>
            </TabsPrimitive.Root>
            <div className="flex flex-wrap items-center gap-2.5">
              <Select
                aria-label="Group players by"
                value={groupBy}
                onChange={(value) => setGroupBy(value as RosterGroupBy)}
                options={groupOptions}
                className="w-auto min-h-[42px] touch:min-h-11"
              />
              <SegmentedControl
                aria-label="Roster view"
                value={view}
                onChange={(value) => setView(value as RosterView)}
                options={[
                  {
                    value: 'list',
                    label: <Icon name="list" />,
                    iconOnly: true,
                    ariaLabel: 'List view',
                  },
                  {
                    value: 'grid',
                    label: <Icon name="grid" />,
                    iconOnly: true,
                    ariaLabel: 'Grid view',
                  },
                ]}
              />
            </div>
            <div className="flex flex-col gap-3" role="tabpanel" aria-label={`${tabLabel} players`}>
              {!rows.length ? (
                <EmptyState>No {tabLabel} players on the roster.</EmptyState>
              ) : sections ? (
                [
                  groupBy === 'skill' ? (
                    <SkillDistributionBar
                      key="skill-mix"
                      counts={{
                        beginner: skillCount('Beginner'),
                        intermediate: skillCount('Intermediate'),
                        advanced: skillCount('Advanced'),
                        unrated: skillCount('No level'),
                      }}
                    />
                  ) : null,
                  ...sections.map((section, index) => (
                    <section
                      key={section.heading}
                      className="flex flex-col gap-2"
                      aria-labelledby={`${headingId}-${index}`}
                    >
                      <h3 id={`${headingId}-${index}`} className="text-[15px] font-bold">
                        {section.heading} · {section.players.length}
                      </h3>
                      <PlayerList
                        players={section.players}
                        view={view}
                        levelsLocked={levelsLocked}
                        readOnly={readOnly}
                        onOpenProfile={onOpenProfile}
                        onLevelChange={onLevelChange}
                        onPresentChange={onPresentChange}
                        onRemove={onRemove}
                      />
                    </section>
                  )),
                ]
              ) : (
                <PlayerList
                  players={rows}
                  view={view}
                  levelsLocked={levelsLocked}
                  readOnly={readOnly}
                  onOpenProfile={onOpenProfile}
                  onLevelChange={onLevelChange}
                  onPresentChange={onPresentChange}
                  onRemove={onRemove}
                />
              )}
            </div>
          </>
        ) : (
          <EmptyState>
            No players yet. Add players from your saved list or as new guests.
          </EmptyState>
        )}
      </section>
    </Card>
  )
}
