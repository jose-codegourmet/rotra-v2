'use client'

import { Button } from '@rotra/ui/button'
import { cn } from '@rotra/ui/cn'
import { CountStepper } from '@rotra/ui/count-stepper'
import { Field } from '@rotra/ui/field'
import { Icon } from '@rotra/ui/icon'
import { Select } from '@rotra/ui/select'

export type RepeatRule = 'none' | 'weekly' | 'biweekly' | 'monthly'

export type RepeatOccurrence = {
  startsAt: number
  endsAt: number
  clash?: { sessionId: string; text: string }
}

export type RepeatSchedulePanelProps = {
  repeat: RepeatRule
  onRepeatChange: (repeat: RepeatRule) => void
  /** 2–12 */
  count: number
  onCountChange: (count: number) => void
  /** Every date of the series with its clash, from the rule in @rotra/data */
  occurrences: RepeatOccurrence[]
  onViewClash: (sessionId: string) => void
  /** "Every date clashes with another session. Change the start date, time or venue." */
  error?: string
  className?: string
}

export const REPEAT_OPTIONS: { value: RepeatRule; label: string }[] = [
  { value: 'none', label: 'Does not repeat' },
  { value: 'weekly', label: 'Every week' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly', label: 'Every month' },
]

const time = (at: number) =>
  new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
const date = (at: number) =>
  new Date(at).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })

/** New sessions only: the Repeats choice, the number of sessions, and each date with its clash. */
export function RepeatSchedulePanel({
  repeat,
  onRepeatChange,
  count,
  onCountChange,
  occurrences,
  onViewClash,
  error,
  className,
}: RepeatSchedulePanelProps) {
  const repeating = repeat !== 'none'
  const clashes = occurrences.filter((o) => o.clash).length
  const created = occurrences.length - clashes
  return (
    <div className={cn('flex flex-col gap-3.5', className)}>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-3.5">
        <Field label="Repeats">
          <Select
            options={REPEAT_OPTIONS}
            value={repeat}
            onChange={(value) => onRepeatChange(value as RepeatRule)}
          />
        </Field>
        {repeating ? (
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-fg2">Number of sessions</span>
            <CountStepper
              value={count}
              min={2}
              max={12}
              onChange={onCountChange}
              decrementLabel="Fewer sessions"
              incrementLabel="More sessions"
            />
          </div>
        ) : null}
      </div>
      {error ? (
        <span role="alert" className="text-[13px] font-semibold text-error">
          {error}
        </span>
      ) : null}
      {repeating ? (
        <>
          <ul aria-label="Session dates" className="m-0 flex list-none flex-col gap-1.5 p-0">
            {occurrences.map((o) => (
              <li
                key={o.startsAt}
                className={cn(
                  'flex items-start gap-2.5 rounded-md border border-border-strong bg-bg px-3 py-2',
                  o.clash && 'border-warn bg-warn-subtle',
                )}
              >
                <span className={cn('mt-0.5 inline-flex', o.clash ? 'text-warn' : 'text-accent')}>
                  <Icon name={o.clash ? 'alert' : 'check'} />
                </span>
                <div className="min-w-0 flex-1">
                  <b>{date(o.startsAt)}</b>{' '}
                  <span className="text-[13px] text-fg2">
                    {time(o.startsAt)}–{time(o.endsAt)}
                  </span>
                  {o.clash ? (
                    <div className="flex flex-wrap items-center gap-1.5 text-[13px]">
                      <span>
                        {o.clash.text} · <b>skipped</b>
                      </span>
                      <Button size="xs" onClick={() => onViewClash(o.clash?.sessionId ?? '')}>
                        View it
                      </Button>
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
          <p className={cn('m-0 text-[13px]', clashes === 0 && 'text-fg2')}>
            {created} session{created === 1 ? '' : 's'} will be created
            {clashes ? `; ${clashes} clashing date${clashes > 1 ? 's are' : ' is'} skipped` : ''}.
            They're separate sessions you can edit one by one.
          </p>
        </>
      ) : null}
    </div>
  )
}
