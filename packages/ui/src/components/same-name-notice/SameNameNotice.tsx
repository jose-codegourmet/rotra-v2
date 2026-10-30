import type { SameNameGroup } from '@rotra/data/admin-player/types'
import { Notice } from '@rotra/ui/notice'
import { type ElementType, Fragment } from 'react'

/** Another player identity with the same name as the one open */
export type SameNameTwin = {
  id: string
  fullName: string
  rtrId: string
  /** Player detail URL; the name renders as a link */
  href?: string
}

export type SameNameNoticeProps =
  | {
      /** Players list search results: one line per name shared by more than one player */
      variant: 'list'
      groups: SameNameGroup[]
    }
  | {
      /** Player detail: the other players with this player's name */
      variant: 'detail'
      twins: SameNameTwin[]
      /** Link element for a twin's href (e.g. Next's Link); defaults to <a> */
      linkComponent?: ElementType
      /** Used for twins without href; the name renders as a button */
      onOpenPlayer?: (playerId: string) => void
    }

const twinClass =
  'border-0 bg-transparent p-0 text-left font-semibold text-accent [overflow-wrap:anywhere] hover:underline hover:underline-offset-3'

/**
 * The warn notice that keeps two people with the same name apart (rotra-admin.html viewPlayers()
 * dupes and viewPlayer() twin). It points to the RTR ID and never offers to merge. Renders nothing
 * when there is no shared name.
 */
export function SameNameNotice(props: SameNameNoticeProps) {
  if (props.variant === 'list') {
    if (props.groups.length === 0) return null
    return (
      <Notice tone="warn">
        {props.groups.map(({ name, count }, index) => (
          <Fragment key={name}>
            {index > 0 ? <br /> : null}
            <b className="[overflow-wrap:anywhere]">
              {count} players are named {name}.
            </b>{' '}
            They're separate people with separate histories. Check the RTR ID before acting.
          </Fragment>
        ))}
      </Notice>
    )
  }

  const { twins, linkComponent: Link = 'a', onOpenPlayer } = props
  if (twins.length === 0) return null
  return (
    <Notice tone="warn" title="Another player has the same name.">
      {twins.map((twin, index) => (
        <Fragment key={twin.id}>
          {index > 0 ? ', ' : null}
          {twin.href ? (
            <Link href={twin.href} className={twinClass}>
              {twin.fullName}
            </Link>
          ) : onOpenPlayer ? (
            <button type="button" onClick={() => onOpenPlayer(twin.id)} className={twinClass}>
              {twin.fullName}
            </button>
          ) : (
            <span className="[overflow-wrap:anywhere]">{twin.fullName}</span>
          )}{' '}
          (<span className="font-mono text-[0.92em] [overflow-wrap:anywhere]">{twin.rtrId}</span>)
        </Fragment>
      ))}{' '}
      is a separate identity. Admin doesn't merge players.
    </Notice>
  )
}
