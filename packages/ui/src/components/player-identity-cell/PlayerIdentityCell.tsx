import { Avatar } from '@rotra/ui/avatar'
import type { ElementType } from 'react'
import {
  type PlayerIdentityCellVariants,
  playerIdentityCellVariants,
} from './PlayerIdentityCell.variants'

export type PlayerIdentityCellProps = PlayerIdentityCellVariants & {
  fullName: string
  /** Shown in quotes under the name in the directory variant */
  nickname?: string | null
  /** Permanent RTR ID, shown under the name in the request variant */
  rtrId?: string
  /** Player detail URL; the name renders as a link */
  href?: string
  /** Link element for href (e.g. Next's Link); defaults to <a> */
  linkComponent?: ElementType
  /** Used when there is no href; the name renders as a button */
  onOpen?: () => void
}

const nameClass =
  'w-fit border-0 bg-transparent p-0 text-left font-bold text-fg [overflow-wrap:anywhere] hover:underline hover:underline-offset-3'

/**
 * The Player cell of an Admin row: initials avatar, the player's name (opens the player when given
 * href or onOpen) and, under it, the nickname (directory) or the RTR ID (request). Never shows a
 * phone or email.
 */
export function PlayerIdentityCell({
  variant,
  fullName,
  nickname,
  rtrId,
  href,
  linkComponent: Link = 'a',
  onOpen,
}: PlayerIdentityCellProps) {
  const secondLine = variant === 'request' ? rtrId : nickname ? `“${nickname}”` : null
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar name={fullName} />
      <div className="flex min-w-0 flex-col gap-px">
        {href ? (
          <Link href={href} className={nameClass}>
            {fullName}
          </Link>
        ) : onOpen ? (
          <button type="button" onClick={onOpen} className={nameClass}>
            {fullName}
          </button>
        ) : (
          <b className="text-fg [overflow-wrap:anywhere]">{fullName}</b>
        )}
        {secondLine ? (
          <span className={playerIdentityCellVariants({ variant })}>{secondLine}</span>
        ) : null}
      </div>
    </div>
  )
}
