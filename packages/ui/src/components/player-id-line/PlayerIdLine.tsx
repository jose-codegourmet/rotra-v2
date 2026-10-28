import { Button } from '@rotra/ui/button'
import { Icon } from '@rotra/ui/icon'
export type PlayerIdLineProps = { rtrId: string; id?: string; onCopy: () => void }
export function PlayerIdLine({ rtrId, id, onCopy }: PlayerIdLineProps) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-md border border-border-strong bg-bg py-2 pr-2 pl-3">
      <code
        id={id}
        className="min-w-0 flex-1 font-mono text-sm tracking-[0.4px] [overflow-wrap:anywhere]"
      >
        {rtrId}
      </code>
      <Button size="xs" onClick={onCopy} aria-label="Copy player ID">
        <Icon name="copy" /> Copy
      </Button>
    </div>
  )
}
