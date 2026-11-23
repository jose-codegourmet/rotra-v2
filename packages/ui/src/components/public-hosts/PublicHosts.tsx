import type { PublicSessionParticipant } from '@rotra/data/public-session/types'
import { Avatar } from '@rotra/ui/avatar'
import { cn } from '@rotra/ui/cn'

export type PublicHost = Omit<PublicSessionParticipant, 'skillGroup' | 'levelLabel'> & {
  id: string
  skillGroup?: PublicSessionParticipant['skillGroup']
  levelLabel?: string | null
  /** True for guests, unclaimed profiles and every visitor view; no nickname. Defaults true. */
  masked?: boolean
}

export type PublicHostsProps = {
  /** Current hosts, oldest first, by the page's name rule. Empty or missing renders nothing. */
  hosts: PublicHost[]
  /**
   * Signed-in viewers (#731): a host with a profile kind becomes a button that calls this, like the
   * Players tiles. Visitors pass nothing and keep plain chips.
   */
  onOpenHost?: (host: PublicHost) => void
  /**
   * A short line under the chips. The session record's Players tab (#1008) says these are the hosts
   * the session ended with. The public page passes nothing.
   */
  note?: string
  className?: string
}

/**
 * Public session page › **Hosts** (#1006, D-2026-11-22-01): a compact row of picture and name chips
 * above Players and Waitlisted. Optional: with no hosts nothing renders. A host who plays also shows
 * in Players; this section never changes capacity or the player count. Hosting is shown, not a role.
 * On a finished session (#1008) the hosts are the ones it ended with, by the name kept then.
 */
export function PublicHosts({ hosts, onOpenHost, note, className }: PublicHostsProps) {
  if (!hosts.length) return null
  return (
    <section aria-label="Hosts" className={cn('flex min-w-0 flex-col gap-2.5', className)}>
      <h3 className="m-0">Hosts · {hosts.length}</h3>
      <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
        {hosts.map((host) => {
          const masked = host.masked ?? true
          const nickname = !masked && host.nickname ? host.nickname : null
          const body = (
            <>
              <Avatar
                name={host.name}
                src={host.pictureUrl ?? undefined}
                className="size-9 shrink-0"
              />
              <span className="min-w-0 text-left">
                <b className="block text-[15px] leading-[1.25] [overflow-wrap:anywhere]">
                  {host.name}
                </b>
                {nickname ? (
                  <span className="block text-[13px] text-fg2 [overflow-wrap:anywhere]">
                    {nickname}
                  </span>
                ) : null}
              </span>
              {host.isViewer ? (
                <span className="rounded-full bg-accent px-2 py-0.5 text-xs leading-[1.4] font-extrabold tracking-[0.4px] text-on-accent uppercase">
                  You
                </span>
              ) : null}
            </>
          )
          const chip =
            'flex min-h-11 max-w-full min-w-0 items-center gap-2.5 rounded-full border border-border bg-surface py-1 pr-3.5 pl-1'
          return (
            <li key={host.id} className="min-w-0 max-w-full">
              {onOpenHost && host.profile ? (
                <button
                  type="button"
                  onClick={() => onOpenHost(host)}
                  title={host.levelLabel ?? undefined}
                  aria-label={
                    host.isViewer
                      ? `${host.name} (you) · view your profile`
                      : `${host.name} · view profile`
                  }
                  className={cn(
                    chip,
                    'cursor-pointer font-[inherit] text-inherit hover:border-border-strong',
                  )}
                >
                  {body}
                </button>
              ) : (
                <div title={host.levelLabel ?? undefined} className={chip}>
                  {body}
                </div>
              )}
            </li>
          )
        })}
      </ul>
      {note ? <p className="m-0 text-[13px] text-fg2">{note}</p> : null}
    </section>
  )
}
