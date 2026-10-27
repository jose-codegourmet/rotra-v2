'use client'
import { Button } from '@rotra/ui/button'
import { TextInput } from '@rotra/ui/text-input'
export type LeaderboardSearchProps = {
  value: string
  onChange: (value: string) => void
  onFindId: (rtrId: string) => void
  error?: string
}
export function LeaderboardSearch({ value, onChange, onFindId, error }: LeaderboardSearchProps) {
  const idSearch = /^rtr-/i.test(value)
  return (
    <search>
      <form
        className="flex flex-col gap-1.5"
        onSubmit={(event) => {
          event.preventDefault()
          if (idSearch) onFindId(value.toUpperCase())
        }}
      >
        <label htmlFor="leaderboard-search" className="text-[13px] font-semibold text-fg2">
          Search the leaderboard
        </label>
        <div className="flex gap-2">
          <TextInput
            id="leaderboard-search"
            type="search"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Name, nickname or RTR ID"
            aria-label="Search the leaderboard"
            invalid={Boolean(error)}
          />
          {idSearch ? <Button type="submit">Find</Button> : null}
        </div>
        <span className={error ? 'text-sm text-error' : 'text-sm text-fg2'}>
          {error ?? "To open a profile that isn't on the leaderboard, enter its full RTR ID."}
        </span>
      </form>
    </search>
  )
}
