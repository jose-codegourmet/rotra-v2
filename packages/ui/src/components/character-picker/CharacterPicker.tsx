'use client'

import { Avatar } from '@rotra/ui/avatar'
import { cn } from '@rotra/ui/cn'
import { Pager } from '@rotra/ui/pager'
import { useState } from 'react'

/** Characters per page: 5 circles in a row, 3 rows (D-2026-11-09-13, changed from 8 on November 11, 2026). */
export const CHARACTER_PICKER_PAGE_SIZE = 15

export type CharacterPickerItem = { id: string; image: string }

export type CharacterPickerProps = {
  /** Shown library characters in order */
  characters: CharacterPickerItem[]
  /** The player's name: the image description and the initials fallback */
  name: string
  /** The chosen character, if any; it gets the accent ring, and the picker opens on its page */
  selectedId?: string | null
  onSelect: (id: string) => void
  /** Saving: nothing can be picked or paged */
  disabled?: boolean
  className?: string
}

/**
 * Profile picture › Or pick a character: a fixed grid of 5 big round characters per row, 3 rows,
 * 15 per page, a 3 px accent ring on the chosen one, then Previous / Page N of M / Next.
 */
export function CharacterPicker({
  characters,
  name,
  selectedId,
  onSelect,
  disabled,
  className,
}: CharacterPickerProps) {
  const [page, setPage] = useState(() => {
    const index = selectedId ? characters.findIndex((item) => item.id === selectedId) : -1
    return index < 0 ? 1 : Math.floor(index / CHARACTER_PICKER_PAGE_SIZE) + 1
  })
  const pageCount = Math.max(1, Math.ceil(characters.length / CHARACTER_PICKER_PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const start = (currentPage - 1) * CHARACTER_PICKER_PAGE_SIZE
  return (
    <div className={cn('flex flex-col', className)}>
      <fieldset
        aria-label={`Characters, page ${currentPage} of ${pageCount}`}
        disabled={disabled}
        className="m-0 grid min-w-0 grid-cols-5 gap-2.5 border-0 p-0"
      >
        {characters.slice(start, start + CHARACTER_PICKER_PAGE_SIZE).map(({ id, image }, index) => (
          <button
            key={id}
            type="button"
            aria-label={`Character ${start + index + 1}`}
            aria-pressed={selectedId === id}
            onClick={() => onSelect(id)}
            className={cn(
              'grid min-w-0 cursor-pointer place-items-center rounded-full border-[3px] border-transparent bg-transparent p-[3px] aria-pressed:border-accent',
              'hover:not-disabled:border-border-strong aria-pressed:hover:border-accent',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
              'disabled:cursor-not-allowed disabled:opacity-45',
            )}
          >
            <Avatar
              name={name}
              src={image}
              className="aspect-square h-auto w-full text-[clamp(16px,4vw,28px)]"
            />
          </button>
        ))}
      </fieldset>
      <Pager
        page={currentPage}
        pageCount={pageCount}
        onPage={setPage}
        aria-label="Character pages"
        disabled={disabled}
      />
    </div>
  )
}
