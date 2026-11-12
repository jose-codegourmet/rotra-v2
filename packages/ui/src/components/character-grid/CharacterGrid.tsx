'use client'

import { cn } from '@rotra/ui/cn'
import { Icon } from '@rotra/ui/icon'
import type { ReactNode } from 'react'
import {
  type CharacterGridVariants,
  characterGridTileVariants,
  characterGridVariants,
} from './CharacterGrid.variants'

export type CharacterGridItem = {
  id: string
  /** The uploaded image; leave it out when `art` draws the tile */
  src?: string
  /** Drawn art instead of an image, e.g. a seeded banner from theme tokens */
  art?: ReactNode
  /** Accessible name; defaults to "Character N" */
  label?: string
  /** Shown under the tile (banner names) */
  caption?: string
  /** false = hidden from players (dimmed) */
  shown: boolean
  /** The stored "Character N" number; it never shifts when an earlier image is deleted */
  number?: number
}

export type CharacterGridProps = CharacterGridVariants & {
  /** In the order players see them; the grid never reorders */
  items: CharacterGridItem[]
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  /** Offline: nothing can be changed */
  disabled?: boolean
  /** Names the grid; defaults to "Character images" */
  'aria-label'?: string
  className?: string
}

/**
 * The prototype's .ch-grid (Admin › Settings › Profile characters): square character images, 88 px
 * minimum, 12 px gap. variant="banner" is .bn-grid (Profile banners): wide 5:2 tiles, 210 px minimum,
 * each with its name under it. Pressing a tile shows or hides it; the small × on its corner deletes
 * it. Characters have no names; the label is their stored number ("Character 3, hidden").
 */
export function CharacterGrid({
  items,
  onToggle,
  onDelete,
  disabled,
  variant,
  'aria-label': ariaLabel = 'Character images',
  className,
}: CharacterGridProps) {
  return (
    <section aria-label={ariaLabel} className={cn(characterGridVariants({ variant }), className)}>
      {items.map((item, index) => {
        const label = item.label ?? `Character ${item.number ?? index + 1}`
        return (
          <div key={item.id} className="relative">
            <button
              type="button"
              aria-pressed={item.shown}
              aria-label={`${label}, ${item.shown ? 'shown' : 'hidden'}`}
              title={
                item.shown
                  ? 'Shown to players. Click to hide.'
                  : 'Hidden from players. Click to show.'
              }
              disabled={disabled}
              onClick={() => onToggle(item.id)}
              className={cn(
                characterGridTileVariants({ variant }),
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
                'disabled:cursor-not-allowed motion-reduce:transition-none',
                item.shown ? disabled && 'opacity-45' : 'opacity-25',
              )}
            >
              {item.src ? (
                // biome-ignore lint/performance/noImgElement: character images are uploaded data or storage URLs, not optimised assets
                <img src={item.src} alt="" className="block size-full object-cover" />
              ) : (
                item.art
              )}
            </button>
            {item.caption ? (
              <span className="mt-1 block text-xs text-fg2 [overflow-wrap:anywhere]">
                {item.caption}
              </span>
            ) : null}
            <button
              type="button"
              aria-label={`Delete ${label}`}
              title="Delete"
              disabled={disabled}
              onClick={() => onDelete(item.id)}
              className={cn(
                'absolute -top-1.5 -right-1.5 grid size-[26px] cursor-pointer place-items-center rounded-full border border-border-strong bg-surface p-0 text-fg shadow-card hover:not-disabled:bg-elev',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
                'disabled:cursor-not-allowed disabled:opacity-45',
              )}
            >
              <Icon name="x" size={16} />
            </button>
          </div>
        )
      })}
    </section>
  )
}
