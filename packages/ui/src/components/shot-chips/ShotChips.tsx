'use client'

import { Button } from '@rotra/ui/button'
import { cn } from '@rotra/ui/cn'
import { Field } from '@rotra/ui/field'
import { Icon } from '@rotra/ui/icon'
import { PickChip } from '@rotra/ui/pick-chip'
import { TextInput } from '@rotra/ui/text-input'
import { useEffect, useRef, useState } from 'react'
import { MAX_OWN_SHOTS, SHOTS, validateOwnShot } from './ShotChips.helpers'

export type ShotChipsProps = {
  /** Picked listed shots (values from SHOTS, e.g. "smash") */
  value: string[]
  onChange: (value: string[]) => void
  /** The player's own shots, shown as picked chips with a remove x */
  ownShots: string[]
  onOwnShotsChange: (ownShots: string[]) => void
  /** Starts with the Add a shot box open (e.g. when the player already has own shots) */
  defaultOthersOpen?: boolean
  /** Names the group */
  'aria-label'?: string
  className?: string
}

/**
 * The Shots you know picker: 12 listed shots (multi-pick) and + Others, which opens an Add a shot
 * box. Own shots show as picked chips with a remove x: up to 6, 24 characters each, none repeating
 * the list. Used in the onboarding step 3 and Edit profile › Playing style.
 */
export function ShotChips({
  value,
  onChange,
  ownShots,
  onOwnShotsChange,
  defaultOthersOpen = false,
  className,
  ...aria
}: ShotChipsProps) {
  const [open, setOpen] = useState(defaultOthersOpen)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus the box when Others opens (the prototype does the same)
  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  const toggle = (shot: string) =>
    onChange(value.includes(shot) ? value.filter((v) => v !== shot) : [...value, shot])

  const add = () => {
    const result = validateOwnShot(draft, ownShots)
    if (result.error !== undefined) {
      setError(result.error)
    } else {
      setError('')
      setDraft('')
      onOwnShotsChange([...ownShots, result.shot])
    }
    inputRef.current?.focus()
  }

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div role="group" aria-label={aria['aria-label'] ?? 'Shots you know'} className="flex flex-wrap gap-2">
        {SHOTS.map((shot) => (
          <PickChip
            key={shot.value}
            role="checkbox"
            picked={value.includes(shot.value)}
            onClick={() => toggle(shot.value)}
          >
            {shot.label}
          </PickChip>
        ))}
        {ownShots.map((shot, i) => (
          <span
            key={shot}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-accent bg-accent-subtle py-0 pr-1.5 pl-3.5 font-semibold text-fg touch:min-h-11"
          >
            <Icon name="check" size={14} />
            {shot}
            <button
              type="button"
              aria-label={`Remove ${shot}`}
              onClick={() => onOwnShotsChange(ownShots.filter((_, j) => j !== i))}
              className="grid size-6 cursor-pointer place-items-center rounded-full text-fg2 hover:bg-elev hover:text-fg focus-visible:outline-2 focus-visible:outline-accent touch:size-8"
            >
              <Icon name="x" size={12} />
            </button>
          </span>
        ))}
        <PickChip
          aria-expanded={open}
          onClick={() => {
            setOpen(!open)
            setError('')
          }}
        >
          + Others
        </PickChip>
      </div>
      {open ? (
        <Field
          label="Add a shot"
          error={error || undefined}
          hint={
            error
              ? undefined
              : `Add as many as you like, up to ${MAX_OWN_SHOTS}.${ownShots.length ? ` ${ownShots.length} added.` : ''}`
          }
        >
          <div className="flex items-start gap-2">
            <TextInput
              ref={inputRef}
              value={draft}
              placeholder="e.g. Crosscourt drop"
              autoComplete="off"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  add()
                }
              }}
            />
            <Button onClick={add}>Add</Button>
          </div>
        </Field>
      ) : null}
    </div>
  )
}
