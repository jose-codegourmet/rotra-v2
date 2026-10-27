import { Avatar } from '@rotra/ui/avatar'
import { Button } from '@rotra/ui/button'
import { Chip } from '@rotra/ui/chip'
import { Icon } from '@rotra/ui/icon'

export type ClubHeaderProps = {
  clubName: string
  logoUrl?: string | null
  initials: string
  /** "Sunday, October 25" */
  todayLabel: string
  /** "Yearly license · active until Mar 31, 2027" */
  licenseLine: string
  /** "Founded at Salinas Dr, Lahug, Cebu City" */
  foundingLine: string
  onCreateSession: () => void
}

/**
 * The top of the club dashboard: logo or initials, "Club dashboard · date", the club name, the
 * License active chip with the license and founding lines, and Create session.
 */
export function ClubHeader({
  clubName,
  logoUrl,
  initials,
  todayLabel,
  licenseLine,
  foundingLine,
  onCreateSession,
}: ClubHeaderProps) {
  return (
    <section aria-label="Club" className="flex min-w-0 flex-wrap items-center gap-4">
      <Avatar
        name={clubName}
        initials={initials}
        src={logoUrl ?? undefined}
        size={88}
        shape="square"
        tone="accent"
        className="size-[76px] text-[28px] max-[520px]:size-14 max-[520px]:rounded-[14px] max-[520px]:text-xl"
      />
      <div className="min-w-0 flex-[1_1_220px]">
        <span className="text-xs font-semibold tracking-[0.5px] text-fg2 uppercase">
          Club dashboard · {todayLabel}
        </span>
        <h1 className="text-[32px] tracking-[-0.6px] [overflow-wrap:anywhere] max-[520px]:text-2xl">
          {clubName}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone="accent">License active</Chip>
          <span className="text-[13px] text-fg2">
            {licenseLine} · {foundingLine}
          </span>
        </div>
      </div>
      <Button variant="primary" onClick={onCreateSession} className="max-[640px]:w-full">
        <Icon name="plus" />
        Create session
      </Button>
    </section>
  )
}
