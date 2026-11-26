import { SegmentedControl } from '@rotra/ui/segmented-control'

export const LEADERBOARD_PERIODS = ['year', 'quarter', 'month', 'week'] as const
export type LeaderboardPeriod = (typeof LEADERBOARD_PERIODS)[number]

export const LEADERBOARD_PERIOD_COPY = {
  year: { label: 'Top annual', current: 'this year', previous: 'last year', list: 'annual' },
  quarter: {
    label: 'Top quarterly',
    current: 'this quarter',
    previous: 'last quarter',
    list: 'quarterly',
  },
  month: { label: 'Top monthly', current: 'this month', previous: 'last month', list: 'monthly' },
  week: { label: 'Top weekly', current: 'this week', previous: 'last week', list: 'weekly' },
} as const

export function leaderboardWinsLabel(wins: number) {
  return `${wins.toLocaleString('en-PH')} ${wins === 1 ? 'win' : 'wins'}`
}

const options = LEADERBOARD_PERIODS.map((period) => ({
  value: period,
  label: LEADERBOARD_PERIOD_COPY[period].label,
}))

export type LeaderboardPeriodSwitchProps = {
  period: LeaderboardPeriod
  dateLabel: string
  onChange: (period: LeaderboardPeriod) => void
}

export function LeaderboardPeriodSwitch({
  period,
  dateLabel,
  onChange,
}: LeaderboardPeriodSwitchProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <SegmentedControl
        aria-label="Leaderboard period"
        value={period}
        options={options}
        onChange={(value) => {
          const next = LEADERBOARD_PERIODS.find((option) => option === value)
          if (next) onChange(next)
        }}
      />
      <span className="text-[13px] text-fg2">
        {dateLabel} · compared with {LEADERBOARD_PERIOD_COPY[period].previous}
      </span>
    </div>
  )
}
