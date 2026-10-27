import { type ClassValue, clsx } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

// The theme removes Tailwind's palette and adds token colours and shadows; teach tailwind-merge the
// custom groups so `bg-surface` and `bg-elev` (or `shadow-card` and `shadow-sheet`) override each other.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      color: [
        'bg',
        'surface',
        'elev',
        'overlay',
        'fg',
        'fg2',
        'fg3',
        'accent',
        'accent-dim',
        'accent-subtle',
        'on-accent',
        'error',
        'error-subtle',
        'warn',
        'warn-subtle',
        'border',
        'border-strong',
        'scrim',
        'field',
        'knob',
        'court',
        'court-line',
        'court-free',
        'court-free-line',
        'on-photo',
        'photo-label',
        'gold',
        'silver',
        'bronze',
        'qr-bg',
        'qr-fg',
      ],
      shadow: ['card', 'sheet', 'pop', 'drawer'],
    },
  },
})

/** Joins class names and resolves Tailwind conflicts (later classes win). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
