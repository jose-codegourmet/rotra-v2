'use client'

import { PLAYING_LEVELS, type PlayingLevel } from '@rotra/data/player/types'
import { cn } from '@rotra/ui/cn'
import { Icon } from '@rotra/ui/icon'
import { levelLabel } from '@rotra/ui/level-select'
import { useEffect, useId, useRef, useState } from 'react'

export type LevelSelectMenuProps = {
  value: PlayingLevel | null
  /** A level was picked: the menu closes and focus returns to the button */
  onChange: (level: PlayingLevel) => void
  /** Required accessible name prefix: "Level for Jose at this club" (": Intermediate Mid" is added) */
  'aria-label': string
  /** Points at the LevelDiffIndicator */
  'aria-describedby'?: string
  className?: string
}

type Band = 'beginner' | 'intermediate' | 'advanced'
const BANDS: Band[] = ['beginner', 'intermediate', 'advanced']
const BAND_NAME: Record<Band, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
}
/** The band colour as --lc (the prototype's .lv-beginner / .lv-intermediate / .lv-advanced) */
const BAND_COLOR: Record<Band, string> = {
  beginner: '[--lc:var(--lv-beg)]',
  intermediate: '[--lc:var(--lv-int)]',
  advanced: '[--lc:var(--lv-adv)]',
}
const bandOf = (level: PlayingLevel | null): Band | null =>
  level ? (BANDS.find((band) => level.startsWith(band)) ?? null) : null

/**
 * The roster's level picker (the prototype's lvMenu): a select-menu button filled in the level's
 * band colour (dashed and muted with no level) with a dot, the level name and a chevron. It opens a
 * listbox of the three bands as tinted groups of Low · Mid · High; the current level is filled in its
 * colour with a check. Picking closes it and returns focus to the button; Esc or a click outside
 * closes it too.
 */
export function LevelSelectMenu({
  value,
  onChange,
  'aria-label': ariaLabel,
  'aria-describedby': describedBy,
  className,
}: LevelSelectMenuProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const listId = useId()
  const band = bandOf(value)

  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.stopPropagation()
      setOpen(false)
      buttonRef.current?.focus()
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const pick = (level: PlayingLevel) => {
    setOpen(false)
    onChange(level)
    buttonRef.current?.focus()
  }

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={`${ariaLabel}: ${value ? levelLabel(value) : 'not set'}`}
        aria-describedby={describedBy}
        onClick={() => setOpen((was) => !was)}
        className={cn(
          'flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-md border px-3 text-left font-bold text-fg',
          band
            ? cn(
                BAND_COLOR[band],
                'border-[var(--lc)] bg-[color-mix(in_srgb,var(--lc)_22%,var(--surface))]',
              )
            : '[--lc:var(--border-strong)] border-dashed border-border-strong bg-field text-fg2',
        )}
      >
        <i aria-hidden className="size-2.5 flex-none rounded-full bg-[var(--lc)]" />
        <span className="min-w-0 flex-1 truncate">
          {value ? levelLabel(value) : 'Choose a level…'}
        </span>
        <Icon
          name="down"
          className={cn(
            'flex-none text-fg2 transition-transform duration-[120ms] motion-reduce:transition-none',
            open && 'rotate-180',
          )}
        />
      </button>
      {open ? (
        <div
          id={listId}
          role="listbox"
          aria-label={ariaLabel}
          className="absolute top-[calc(100%+4px)] right-0 left-0 z-30 flex min-w-[220px] flex-col gap-1 rounded-lg border border-border-strong bg-elev p-1.5 shadow-pop"
        >
          {BANDS.map((group) => (
            // biome-ignore lint/a11y/useSemanticElements: a tinted band of options inside the listbox
            <div
              key={group}
              role="group"
              aria-label={BAND_NAME[group]}
              className={cn(
                BAND_COLOR[group],
                'grid grid-cols-3 gap-1 rounded-md bg-[color-mix(in_srgb,var(--lc)_10%,transparent)] p-1.5',
              )}
            >
              <span
                aria-hidden
                className="col-span-full flex items-center gap-1.5 text-[11px] font-extrabold tracking-[0.5px] text-fg2 uppercase"
              >
                <i className="size-2 rounded-full bg-[var(--lc)]" />
                {BAND_NAME[group]}
              </span>
              {PLAYING_LEVELS.filter((level) => level.startsWith(group)).map((level) => {
                const on = level === value
                return (
                  <button
                    key={level}
                    type="button"
                    role="option"
                    aria-selected={on}
                    onClick={() => pick(level)}
                    className={cn(
                      'inline-flex min-h-9 cursor-pointer items-center justify-center gap-1 rounded-[6px] border px-1.5 text-[13px] font-semibold',
                      on
                        ? 'border-[var(--lc)] bg-[var(--lc)] text-on-level'
                        : 'border-transparent bg-surface text-fg hover:border-[var(--lc)] focus-visible:border-[var(--lc)]',
                    )}
                  >
                    {levelLabel(level).replace(`${BAND_NAME[group]} `, '')}
                    {on ? <Icon name="check" size={14} /> : null}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
