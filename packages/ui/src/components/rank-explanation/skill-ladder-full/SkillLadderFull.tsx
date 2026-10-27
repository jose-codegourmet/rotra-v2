import { cn } from '@rotra/ui/cn'
export type SkillLadderFullProps = {
  player?: { firstName: string; levelIndex: number | null; stale: boolean }
}
export function SkillLadderFull({ player }: SkillLadderFullProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {['Advanced', 'Intermediate', 'Beginner'].map((tier, t) => (
        <div
          key={tier}
          className="grid grid-cols-[140px_minmax(0,1fr)] items-center gap-3 max-[480px]:grid-cols-1 max-[480px]:gap-1"
        >
          <span className="text-[13px] font-semibold text-fg2">{tier}</span>
          <div className="grid grid-cols-3 gap-1">
            {['Low', 'Mid', 'High'].map((step, s) => {
              const current = player?.levelIndex === (2 - t) * 3 + s
              const label = `${tier} ${step}`
              return (
                <b
                  role="img"
                  aria-label={current ? `${label}: ${player?.firstName} is here` : label}
                  key={step}
                  className={cn(
                    'grid min-h-[30px] place-items-center rounded-sm bg-elev text-[13px] font-bold text-fg2',
                    current &&
                      (player?.stale ? 'bg-warn text-on-accent' : 'bg-accent text-on-accent'),
                  )}
                >
                  {step}
                </b>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
