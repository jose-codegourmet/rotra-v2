import { TextInput } from '@rotra/ui/text-input'

export type QueueSearchFieldProps = {
  value: string
  onChange: (value: string) => void
  /** Number of waiting matches containing the search. */
  matchCount: number
}

export function QueueSearchField({ value, onChange, matchCount }: QueueSearchFieldProps) {
  const query = value.trim()
  return (
    <div className="flex flex-col gap-1.5">
      {/* biome-ignore lint/a11y/noLabelWithoutControl: TextInput renders the input inside this label */}
      <label>
        <span className="sr-only">Find a player in the queue</span>
        <TextInput
          type="search"
          placeholder="Find a player in the queue"
          autoComplete="off"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
      <span aria-live="polite" className={matchCount ? 'text-xs' : 'text-xs text-fg2'}>
        {query
          ? matchCount
            ? `${matchCount} queued match${matchCount === 1 ? '' : 'es'} with ${query}`
            : 'Not in any queued match'
          : null}
      </span>
    </div>
  )
}
