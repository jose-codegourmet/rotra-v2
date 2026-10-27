import { cn } from '@rotra/ui/cn'

export type AddCourtTileProps = {
  /** The number the new court gets: "Becomes Court N, free right away" */
  nextNumber: number
  /** Opens Q-ADD-COURT */
  onAdd: () => void
  className?: string
}

/** The last tile in the Courts grid: a dashed "+ Add court" button. The prototypes' .court.add-court. */
export function AddCourtTile({ nextNumber, onAdd, className }: AddCourtTileProps) {
  return (
    <button
      type="button"
      onClick={onAdd}
      aria-label={`Add Court ${nextNumber}`}
      className={cn(
        'flex min-h-[180px] min-w-0 flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border-strong bg-transparent p-3.5 text-center font-bold text-fg2',
        'hover:border-accent hover:bg-accent-subtle hover:text-accent',
        className,
      )}
    >
      <span aria-hidden className="text-[30px] leading-none font-normal">
        +
      </span>
      <span>Add court</span>
      <span className="text-[13px] font-medium text-fg2">
        Becomes Court {nextNumber}, free right away
      </span>
    </button>
  )
}
