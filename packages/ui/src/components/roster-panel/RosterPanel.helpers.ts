import type { PlayingLevel } from '@rotra/data/player/types'
import type { Identity } from '@rotra/ui/identity-chip/variants'

/** Level family tabs, plus All. No level is omitted from the row while nobody is missing a level. */
export type RosterLevelTab = 'all' | 'advanced' | 'intermediate' | 'beginner' | 'none'

/** Prototype `S.ui.rv.by` keys. Skill group is offered on the All tab only. */
export type RosterGroupBy = 'none' | 'skill' | 'avail' | 'prior' | 'profile' | 'paid'

export type RosterView = 'list' | 'grid'

export type RosterGroupablePlayer = {
  level: PlayingLevel | null
  present: boolean
  /** Played a session at this club before. Callers that do not know yet pass false. */
  returning?: boolean
  identity: Identity
  paid?: boolean
}

export const ROSTER_LEVEL_TAB_LABEL: Record<RosterLevelTab, string> = {
  all: 'All',
  advanced: 'Advanced',
  intermediate: 'Intermediate',
  beginner: 'Beginner',
  none: 'No level',
}

export const ROSTER_GROUP_BY_LABEL: Record<RosterGroupBy, string> = {
  none: 'None',
  skill: 'Skill group',
  avail: 'Availability',
  prior: 'Returning or first time',
  profile: 'ROTRA profile',
  paid: 'Payment',
}

const GROUP_ORDER: Record<Exclude<RosterGroupBy, 'none'>, string[]> = {
  skill: ['Advanced', 'Intermediate', 'Beginner', 'No level'],
  avail: ['Present', 'Not present'],
  prior: ['Returning', 'First time here'],
  profile: ['Has a ROTRA profile', 'Guest'],
  paid: ['Paid', 'Not paid'],
}

/** Advanced Low/Mid/High → advanced, and so on; missing level → none. */
export function rosterLevelFamily(level: PlayingLevel | null): Exclude<RosterLevelTab, 'all'> {
  if (!level) return 'none'
  const band = level.split('_')[0]
  if (band === 'advanced' || band === 'intermediate' || band === 'beginner') return band
  return 'none'
}

export function rosterLevelTabs(players: { level: PlayingLevel | null }[]): {
  value: RosterLevelTab
  label: string
  count: number
}[] {
  const counts = { all: players.length, advanced: 0, intermediate: 0, beginner: 0, none: 0 }
  for (const player of players) counts[rosterLevelFamily(player.level)] += 1
  const values: RosterLevelTab[] = ['all', 'advanced', 'intermediate', 'beginner']
  if (counts.none) values.push('none')
  return values.map((value) => ({
    value,
    label: ROSTER_LEVEL_TAB_LABEL[value],
    count: counts[value],
  }))
}

export function resolveRosterLevelTab(
  tab: RosterLevelTab,
  tabs: { value: RosterLevelTab }[],
): RosterLevelTab {
  return tabs.some((item) => item.value === tab) ? tab : 'all'
}

export function filterRosterByLevelTab<T extends { level: PlayingLevel | null }>(
  players: T[],
  tab: RosterLevelTab,
): T[] {
  if (tab === 'all') return players
  return players.filter((player) => rosterLevelFamily(player.level) === tab)
}

/** Skill group only splits All; a level tab falls back to None. */
export function resolveRosterGroupBy(groupBy: RosterGroupBy, tab: RosterLevelTab): RosterGroupBy {
  return groupBy === 'skill' && tab !== 'all' ? 'none' : groupBy
}

export function rosterGroupByOptions(
  tab: RosterLevelTab,
): { value: RosterGroupBy; label: string }[] {
  const values: RosterGroupBy[] =
    tab === 'all'
      ? ['none', 'skill', 'avail', 'prior', 'profile', 'paid']
      : ['none', 'avail', 'prior', 'profile', 'paid']
  return values.map((value) => ({
    value,
    label: `Group by: ${ROSTER_GROUP_BY_LABEL[value]}`,
  }))
}

export function rosterGroupName(
  player: RosterGroupablePlayer,
  groupBy: Exclude<RosterGroupBy, 'none'>,
): string {
  switch (groupBy) {
    case 'skill': {
      const family = rosterLevelFamily(player.level)
      return family === 'none' ? 'No level' : ROSTER_LEVEL_TAB_LABEL[family]
    }
    case 'avail':
      return player.present ? 'Present' : 'Not present'
    case 'prior':
      return player.returning ? 'Returning' : 'First time here'
    case 'profile':
      return player.identity === 'registered' || player.identity === 'unclaimed'
        ? 'Has a ROTRA profile'
        : 'Guest'
    case 'paid':
      return player.paid ? 'Paid' : 'Not paid'
  }
}

/** Headings in prototype order; empty groups are omitted; roster order is kept inside each group. */
export function groupRosterPlayers<T extends RosterGroupablePlayer>(
  players: T[],
  groupBy: RosterGroupBy,
): { heading: string; players: T[] }[] | null {
  if (groupBy === 'none') return null
  return GROUP_ORDER[groupBy]
    .map((heading) => ({
      heading,
      players: players.filter((player) => rosterGroupName(player, groupBy) === heading),
    }))
    .filter((group) => group.players.length > 0)
}
