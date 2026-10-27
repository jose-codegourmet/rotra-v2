import { formatPeso } from '@rotra/schema/money'
import { Button } from '@rotra/ui/button'
import { Icon } from '@rotra/ui/icon'

export type VenueCardProps = {
  name: string
  address: string | null
  /** Integer centavos, or null when not set */
  courtFeeMinor: number | null
  entranceFeeMinor: number | null
  sessionsHere: number
  /** The next prepared session here */
  next?: { title: string; dateLabel: string }
  onCreateSession: () => void
  onEdit: () => void
}

/** One saved venue on the Venues page: address, fees, sessions here, what is next, and actions. */
export function VenueCard({
  name,
  address,
  courtFeeMinor,
  entranceFeeMinor,
  sessionsHere,
  next,
  onCreateSession,
  onEdit,
}: VenueCardProps) {
  const stats = [
    [courtFeeMinor != null ? formatPeso(courtFeeMinor) : '—', 'per court, per hour'],
    [entranceFeeMinor != null ? formatPeso(entranceFeeMinor) : '—', 'entrance per head'],
    [String(sessionsHere), `session${sessionsHere === 1 ? '' : 's'} here`],
  ] as const
  return (
    <article className="flex min-w-0 flex-col gap-3 rounded-[14px] border border-border-strong bg-surface p-4">
      <div className="flex items-start gap-3">
        <span className="grid size-10 flex-none place-items-center rounded-xl bg-accent-subtle text-accent">
          <Icon name="pin" />
        </span>
        <div className="min-w-0">
          <b className="block text-base [overflow-wrap:anywhere]">{name}</b>
          <p className="m-0 text-[13px] text-fg2 [overflow-wrap:anywhere]">
            {address || 'No address'}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {stats.map(([value, label]) => (
          <div key={label} className="flex min-w-0 flex-col rounded-md bg-bg px-2.5 py-2">
            <b className="text-lg font-extrabold tabular-nums">{value}</b>
            <span className="text-[11px] text-fg2">{label}</span>
          </div>
        ))}
      </div>
      <p className="m-0 text-[13px] text-fg2 [overflow-wrap:anywhere]">
        {next ? `Next: ${next.title} · ${next.dateLabel}` : 'Nothing booked here yet'}
      </p>
      <div className="mt-auto flex flex-wrap items-center gap-2">
        <Button size="sm" variant="primary" onClick={onCreateSession}>
          Create session here
        </Button>
        <Button size="sm" onClick={onEdit} aria-label={`Edit ${name}`}>
          Edit
        </Button>
      </div>
    </article>
  )
}
