'use client'

import { ChoiceGroup } from '@rotra/ui/choice-group'
import { cn } from '@rotra/ui/cn'

export type CourtPosition = 'front' | 'back' | 'all'

export const COURT_POSITIONS: { value: CourtPosition; title: string; description: string }[] = [
  { value: 'front', title: 'Front court', description: 'Net play, pushes and quick kills at the front.' },
  { value: 'back', title: 'Back court', description: 'Clears, smashes and drops from the back.' },
  { value: 'all', title: 'All-round', description: 'Comfortable anywhere on court.' },
]

export type CourtPositionCardProps = {
  /** The picked position, or '' when nothing is picked yet */
  value: CourtPosition | ''
  onChange: (value: CourtPosition) => void
  /** Image path per position, e.g. /art/onboarding/court-front.webp; the app supplies them */
  art: Record<CourtPosition, string>
  'aria-label'?: string
  disabled?: boolean
  className?: string
}

/**
 * The Where you play cards: Front court, Back court, All-round, one pick, each with a Higgsfield
 * picture on top. Wraps ChoiceGroup's art cards: the picture shows full colour only when picked or
 * hovered, and a picked card gets the accent check. Three across from 720 px; on phones the picture
 * is 3:1.
 */
export function CourtPositionCard({
  value,
  onChange,
  art,
  disabled,
  className,
  ...aria
}: CourtPositionCardProps) {
  return (
    <ChoiceGroup
      type="single"
      aria-label={aria['aria-label'] ?? 'Where you play'}
      value={value}
      onChange={(next) => onChange(next as CourtPosition)}
      disabled={disabled}
      choices={COURT_POSITIONS.map((p) => ({ ...p, art: art[p.value] }))}
      className={cn(
        'grid-cols-1 min-[720px]:grid-cols-3',
        // ChoiceGroup's art is 16:9; the prototype uses 12:5 (3:1 on phones)
        '[&_.aspect-video]:aspect-[3/1] min-[641px]:[&_.aspect-video]:aspect-[12/5]',
        className,
      )}
    />
  )
}
