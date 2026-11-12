import { Avatar } from '@rotra/ui/avatar'
import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { Chip } from '@rotra/ui/chip'
import { formatSessionDay } from '@rotra/ui/date-block'
import { Icon, type IconName } from '@rotra/ui/icon'

export type ClubPageHeroProps = {
  name: string
  /** The club's stored initials; the club mark (fixtures have no club picture) */
  initials: string
  logoUrl?: string | null
  /** Founding city, e.g. "Cebu City" */
  city: string
  /** Registered members listed on the page (the count equals the list) */
  memberCount: number
  /** Members currently shown in the grid ("N shown below") */
  membersShown: number
  upcomingCount: number
  /** The soonest upcoming session, or null when nothing is scheduled */
  next: { live: boolean; startsAt: number } | null
  /** Sessions this month, and how many of them are done */
  monthCount: number
  monthDone: number
  /** The club's current invite link (`/register/<clubId>?k=<code>`) */
  joinHref: string
  onShare: () => void
  /**
   * Set for a signed-in viewer who is a current member (#766): Leave club shows in place of Join this
   * club; the container opens the Leave confirm sheet.
   */
  onLeave?: () => void
}

const num = (n: number) => n.toLocaleString('en-US')
const plural = (n: number, word: string) => `${word}${n === 1 ? '' : 's'}`

function StatCard({
  icon,
  value,
  label,
  detail,
}: {
  icon: IconName
  value: number
  label: string
  detail: string
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-lg border border-border bg-bg px-3.5 py-3">
      <span
        aria-hidden
        className="grid size-10 flex-none place-items-center rounded-full bg-accent-subtle text-accent"
      >
        <Icon name={icon} />
      </span>
      <span className="flex min-w-0 flex-col">
        <b className="text-[22px] leading-[1.1] tabular-nums">{num(value)}</b>
        <span className="truncate text-xs text-fg2">{label}</span>
      </span>
      <span className="ml-auto flex-none text-right text-xs text-fg2">{detail}</span>
    </div>
  )
}

/**
 * P-CLUB-PAGE hero: the club mark and name side by side (no banner: banners are a player-profile
 * thing only), a chip row, Join this club (Leave club for a member) and Share club page, and three
 * stat cards.
 */
export function ClubPageHero({
  name,
  initials,
  logoUrl,
  city,
  memberCount,
  membersShown,
  upcomingCount,
  next,
  monthCount,
  monthDone,
  joinHref,
  onShare,
  onLeave,
}: ClubPageHeroProps) {
  return (
    <Card asChild>
      <section className="relative flex flex-col gap-3.5 pt-4">
        <div className="flex min-w-0 items-center gap-3.5 max-[640px]:flex-col max-[640px]:items-start max-[640px]:gap-2">
          <Avatar name={name} initials={initials} src={logoUrl ?? undefined} size={88} />
          <div className="flex min-w-0 flex-col gap-1.5">
            <h1 className="m-0 text-[clamp(24px,4vw,34px)] [overflow-wrap:anywhere] max-[640px]:text-2xl">
              {name}
            </h1>
            <div className="mt-1 flex flex-wrap gap-2">
              <Chip>
                <Icon name="pin" size={13} />
                {city}
              </Chip>
              <Chip>
                {num(memberCount)} {plural(memberCount, 'member')}
              </Chip>
              {next ? (
                <Chip tone={next.live ? 'accent' : 'neutral'}>
                  {next.live ? 'Playing now' : `Next ${formatSessionDay(next.startsAt)}`}
                </Chip>
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 min-[920px]:absolute min-[920px]:top-4 min-[920px]:right-4">
          {onLeave ? (
            <Button onClick={onLeave}>Leave club</Button>
          ) : (
            <Button variant="primary" asChild>
              <a href={joinHref}>Join this club</a>
            </Button>
          )}
          <Button onClick={onShare}>
            <Icon name="share" />
            Share club page
          </Button>
        </div>
        <fieldset
          aria-label="Club at a glance"
          className="m-0 grid min-w-0 grid-cols-3 gap-2.5 border-0 p-0 max-[760px]:grid-cols-1 max-[760px]:gap-2"
        >
          <StatCard
            icon="members"
            value={memberCount}
            label="Registered members"
            detail={
              memberCount ? `${num(Math.min(membersShown, memberCount))} shown below` : 'None yet'
            }
          />
          <StatCard
            icon="calendar-month"
            value={upcomingCount}
            label={plural(upcomingCount, 'Upcoming session')}
            detail={
              next
                ? next.live
                  ? 'One is happening now'
                  : `Next ${formatSessionDay(next.startsAt)}`
                : 'Nothing scheduled'
            }
          />
          <StatCard
            icon="activity"
            value={monthCount}
            label={`${plural(monthCount, 'Session')} this month`}
            detail={`${num(monthDone)} done · ${num(monthCount - monthDone)} to come`}
          />
        </fieldset>
      </section>
    </Card>
  )
}
