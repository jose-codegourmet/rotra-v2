import { cn } from '@rotra/ui/cn'

const LABELS = [
  'Beginner Low',
  'Beginner Mid',
  'Beginner High',
  'Intermediate Low',
  'Intermediate Mid',
  'Intermediate High',
  'Advanced Low',
  'Advanced Mid',
  'Advanced High',
]
export function SkillLadder({ level, stale = false }: { level: number | null; stale?: boolean }) {
  const label =
    level === null ? 'No rank on the skill ladder yet' : `${LABELS[level - 1]}: level ${level} of 9`
  return (
    <div role="img" aria-label={label} className="grid grid-cols-3 gap-1">
      {LABELS.map((item, index) => (
        <span
          key={item}
          className={cn(
            'h-3 rounded-sm bg-elev',
            level !== null && index + 1 <= level && (stale ? 'bg-warn/55' : 'bg-accent/55'),
            level === index + 1 && 'ring-2 ring-fg',
          )}
        />
      ))}
    </div>
  )
}
