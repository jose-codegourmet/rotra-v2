'use client'
import { Field } from '@rotra/ui/field'
import { Select } from '@rotra/ui/select'
import { TextInput } from '@rotra/ui/text-input'
import { useState } from 'react'

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]
const MONTH_OPTIONS = MONTHS.map((label, index) => ({ value: String(index + 1), label }))

export type ExperienceValue = { years: string; months: string }
export type ExperienceFieldsProps = {
  /** Years and months as typed; the form stores these */
  value: ExperienceValue
  onChange: (value: ExperienceValue) => void
  yearsError?: string
  monthsError?: string
  disabled?: boolean
  /** Fixed "today" for stories; defaults to the current date */
  now?: Date
}

const monthIndex = (date: Date) => date.getFullYear() * 12 + date.getMonth()

/** Years + months → playing since (month 1–12, year), or blanks when nothing usable is typed. */
export function playingSinceOf({ years, months }: ExperienceValue, now = new Date()) {
  const y = years.trim()
  const m = months.trim()
  if ((!y && !m) || !/^\d*$/.test(y) || !/^\d*$/.test(m) || Number(m) > 11)
    return { month: '', year: '' }
  const since = monthIndex(now) - (Number(y || 0) * 12 + Number(m || 0))
  return { month: String((since % 12) + 1), year: String(Math.floor(since / 12)) }
}

/** Playing since → years + months, or null while it is incomplete or in the future. */
export function experienceOf(month: string, year: string, now = new Date()): ExperienceValue | null {
  if (!month || !/^\d{4}$/.test(year.trim())) return null
  const elapsed = monthIndex(now) - (Number(year) * 12 + Number(month) - 1)
  if (elapsed < 0) return null
  return { years: String(Math.floor(elapsed / 12)), months: String(elapsed % 12) }
}

/**
 * Experience as Years + months and as Playing since (month, year). They are two views of one value:
 * typing either fills the other. Only years and months are form values.
 */
export function ExperienceFields({
  value,
  onChange,
  yearsError,
  monthsError,
  disabled = false,
  now,
}: ExperienceFieldsProps) {
  const [since, setSince] = useState(() => playingSinceOf(value, now))
  const [sinceError, setSinceError] = useState<string>()
  const typeDuration = (next: ExperienceValue) => {
    onChange(next)
    setSince(playingSinceOf(next, now))
    setSinceError(undefined)
  }
  const typeSince = (month: string, year: string) => {
    setSince({ month, year })
    const future =
      month && /^\d{4}$/.test(year.trim()) && !experienceOf(month, year, now)
        ? "Playing since can't be in the future."
        : undefined
    setSinceError(future)
    const next = experienceOf(month, year, now)
    if (next) onChange(next)
  }
  return (
    <div className="flex flex-col gap-3.5">
      <div className="grid grid-cols-2 gap-3.5">
        <Field label="Years" error={yearsError}>
          <TextInput
            value={value.years}
            onChange={(event) => typeDuration({ ...value, years: event.target.value })}
            inputMode="numeric"
            placeholder="0"
            disabled={disabled}
          />
        </Field>
        <Field label="Months" error={monthsError}>
          <TextInput
            value={value.months}
            onChange={(event) => typeDuration({ ...value, months: event.target.value })}
            inputMode="numeric"
            placeholder="0"
            disabled={disabled}
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3.5">
        <Field label="Playing since" error={sinceError}>
          <Select
            options={MONTH_OPTIONS}
            value={since.month}
            onChange={(month) => typeSince(month, since.year)}
            placeholder="Month"
            disabled={disabled}
            invalid={!!sinceError}
          />
        </Field>
        <Field label="Year">
          <TextInput
            value={since.year}
            onChange={(event) => typeSince(since.month, event.target.value)}
            inputMode="numeric"
            placeholder={String((now ?? new Date()).getFullYear() - 2)}
            disabled={disabled}
          />
        </Field>
      </div>
    </div>
  )
}
