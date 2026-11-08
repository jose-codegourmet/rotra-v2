export type SkillMixCounts = {
  beginner: number
  intermediate: number
  advanced: number
  /** Players with no level yet */
  unrated?: number
}

export type SkillMixKey = 'beginner' | 'intermediate' | 'advanced' | 'unrated'

export type SkillMixSegmentData = {
  key: SkillMixKey
  label: string
  count: number
  /** Share of all counted players, 0 to 100 (for callers that size by width, not flex-grow) */
  widthPct: number
  /** Hover and spoken text: "Beginner: 4 players", "1 with no level" */
  tip: string
  /** Token background class for the segment color (never green) */
  tone: string
}

/** Left to right: Beginner, Intermediate, Advanced, then No level. */
const GROUPS = [
  { key: 'beginner', label: 'Beginner', tone: 'bg-lv-beg' },
  { key: 'intermediate', label: 'Intermediate', tone: 'bg-lv-int' },
  { key: 'advanced', label: 'Advanced', tone: 'bg-lv-adv' },
  { key: 'unrated', label: 'No level', tone: 'bg-lv-none' },
] as const

export function skillMixTip(key: SkillMixKey, label: string, count: number): string {
  if (key === 'unrated') return `${count} with no level`
  return `${label}: ${count} ${count === 1 ? 'player' : 'players'}`
}

/** Groups with nobody are left out; the rest keep the fixed order and are sized by head count. */
export function skillMixSegments(counts: SkillMixCounts): SkillMixSegmentData[] {
  const items = GROUPS.map((g) => ({ ...g, count: counts[g.key] ?? 0 })).filter((g) => g.count > 0)
  const total = items.reduce((sum, g) => sum + g.count, 0)
  return items.map((g) => ({
    key: g.key,
    label: g.label,
    count: g.count,
    widthPct: total ? (g.count / total) * 100 : 0,
    tip: skillMixTip(g.key, g.label, g.count),
    tone: g.tone,
  }))
}
