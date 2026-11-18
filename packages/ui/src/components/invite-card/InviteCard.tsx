import { Avatar } from '@rotra/ui/avatar'
import { Card } from '@rotra/ui/card'
import { Chip } from '@rotra/ui/chip'
import { cn } from '@rotra/ui/cn'
import { DateBlock } from '@rotra/ui/date-block'
import type { ReactNode } from 'react'

type InviteCardBase = {
  className?: string
}

export type ClubInvite = InviteCardBase & {
  variant: 'club'
  clubName: string
  clubInitials?: string
  clubLogoUrl?: string
  /** City chip, e.g. "Cebu City" */
  city?: string
  memberCount: number
}

export type SessionInvite = InviteCardBase & {
  variant: 'session'
  sessionTitle: string
  clubName: string
  clubInitials?: string
  clubLogoUrl?: string
  /** Session start (epoch ms): the date block. Leave out when it is unknown. */
  startsAt?: number
  /** "Thu, Nov 13 · 7:00 PM", already formatted by the app */
  when?: string
  /** The player who shared the invite; without one the card reads "You're invited to play" */
  inviter?: {
    /** Full name, for "Invited by <name>" */
    name: string
    /** Name used in the heading ("<short> invites you to play"); the first name or nickname */
    shortName?: string
    pictureUrl?: string
  }
}

export type AdminInvite = InviteCardBase & {
  variant: 'admin'
}

export type InviteCardProps = ClubInvite | SessionInvite | AdminInvite

/**
 * The prototype's .invite-card (inviteHero): the landing card at the top of P-INVITE, P-JOIN-CLUB and
 * P-JOIN-SESSION. Club, session (with or without an inviter) and ROTRA Admin registration link.
 */
export function InviteCard(props: InviteCardProps) {
  if (props.variant === 'club') {
    const { clubName, clubInitials, clubLogoUrl, city, memberCount, className } = props
    return (
      <Shell label="Club invite" className={className}>
        <Top>
          <Avatar size={64} name={clubName} initials={clubInitials} src={clubLogoUrl} />
          <div className="flex min-w-0 flex-col gap-1">
            <Label>Club invite</Label>
            <Heading>Join {clubName}</Heading>
            <div className="flex flex-wrap items-center gap-2">
              {city ? <Chip>{city}</Chip> : null}
              <Chip>
                {memberCount.toLocaleString()} member{memberCount === 1 ? '' : 's'}
              </Chip>
            </div>
          </div>
        </Top>
        <Body>
          <p className="m-0 text-fg2">
            You're added to {clubName}'s saved players. The club can put you in its sessions and
            record your games. You can leave any time from the club page.
          </p>
        </Body>
      </Shell>
    )
  }
  if (props.variant === 'session') {
    const {
      sessionTitle,
      clubName,
      clubInitials,
      clubLogoUrl,
      startsAt,
      when,
      inviter,
      className,
    } = props
    return (
      <Shell label="Session invite" className={className}>
        <Top>
          <Avatar
            size={52}
            name={inviter ? inviter.name : clubName}
            initials={inviter ? undefined : clubInitials}
            src={inviter ? inviter.pictureUrl : clubLogoUrl}
          />
          <div className="flex min-w-0 flex-col gap-1">
            <Label>Session invite</Label>
            <Heading>
              {inviter
                ? `${inviter.shortName ?? inviter.name.split(/\s+/)[0]} invites you to play`
                : "You're invited to play"}
            </Heading>
          </div>
        </Top>
        <Body>
          <div className="flex items-center gap-3">
            {startsAt !== undefined ? <DateBlock at={startsAt} /> : null}
            <div className="flex min-w-0 flex-col gap-1">
              <b className="text-lg [overflow-wrap:anywhere]">{sessionTitle}</b>
              <span className="text-fg2 [overflow-wrap:anywhere]">{clubName}</span>
              {when ? <span className="text-[13px] text-fg2">{when}</span> : null}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Chip tone="accent">Join requests open</Chip>
            {inviter ? <Chip>Invited by {inviter.name}</Chip> : null}
          </div>
          <p className="m-0 text-[13px] text-fg2">
            The Queue Master confirms who plays. Signing up doesn't reserve a spot.
          </p>
        </Body>
      </Shell>
    )
  }
  return (
    <Shell label="ROTRA registration" className={props.className}>
      <Top>
        <div className="flex min-w-0 flex-col gap-1">
          <Label>ROTRA registration</Label>
          <Heading>Create your ROTRA account</Heading>
        </div>
      </Top>
      <Body>
        <p className="m-0 text-fg2">
          Your player profile, player ID and game history in one place.
        </p>
      </Body>
    </Shell>
  )
}

function Shell({
  label,
  className,
  children,
}: {
  label: string
  className?: string
  children: ReactNode
}) {
  return (
    <Card asChild padding="none" className={cn('overflow-hidden', className)}>
      <section aria-label={label}>{children}</section>
    </Card>
  )
}

function Top({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-3.5 border-b border-border bg-accent-subtle p-5">
      {children}
    </div>
  )
}

function Body({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-3 p-5">{children}</div>
}

function Label({ children }: { children: ReactNode }) {
  return (
    <span className="text-xs font-semibold tracking-[0.5px] text-fg2 uppercase">{children}</span>
  )
}

function Heading({ children }: { children: ReactNode }) {
  return <h1 className="text-[22px] [overflow-wrap:anywhere]">{children}</h1>
}
