import { Avatar } from '@rotra/ui/avatar'
import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { EmptyState } from '@rotra/ui/empty-state'

export type ClubMemberCell = {
  /** Stable row key (a masked member carries no player id) */
  key: string
  /** Full name, or the masked name ("J*** D***") */
  name: string
  picture?: string | null
  /** The level label, or "You" on the viewer's own cell */
  caption: string
  /** False for a masked member: shown without a button */
  openable: boolean
}

export type ClubMemberGridProps = {
  /** The members shown so far (12 at a time) */
  members: ClubMemberCell[]
  /** Every listed member; the count equals the list */
  totalCount: number
  /** Signed out: the masked-names hint shows */
  signedIn: boolean
  onShowMore: () => void
  /** The Members page (/clubs/[clubId]/members) */
  seeAllHref: string
  onOpen: (key: string) => void
}

const num = (n: number) => n.toLocaleString('en-US')

/**
 * P-CLUB-PAGE › Members: a four-across grid of round avatars with names and levels. Masked members
 * have no button; Show more adds 12; See all N opens the Members page.
 */
export function ClubMemberGrid({
  members,
  totalCount,
  signedIn,
  onShowMore,
  seeAllHref,
  onOpen,
}: ClubMemberGridProps) {
  return (
    <Card asChild>
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2>Members</h2>
          <Button size="xs" asChild>
            <a href={seeAllHref}>See all {num(totalCount)}</a>
          </Button>
        </div>
        {signedIn ? null : (
          <p className="m-0 text-sm text-fg2">Names are masked. Sign in with ROTRA to see them.</p>
        )}
        {totalCount ? (
          <>
            <div className="grid grid-cols-4 gap-2">
              {members.map((member) => {
                const inner = (
                  <>
                    <Avatar
                      name={member.name}
                      src={member.picture ?? undefined}
                      size={52}
                      className="group-hover/cell:shadow-[0_0_0_3px_var(--surface),0_0_0_5px_var(--accent)] group-focus-visible/cell:shadow-[0_0_0_3px_var(--surface),0_0_0_5px_var(--accent)]"
                    />
                    <b className="max-w-full truncate text-xs">{member.name}</b>
                    <span className="max-w-full truncate text-[11px] text-fg2">
                      {member.caption}
                    </span>
                  </>
                )
                const cell =
                  'flex min-w-0 flex-col items-center gap-1 rounded-md border-0 bg-transparent px-0.5 py-1.5 text-center text-inherit'
                return member.openable ? (
                  <button
                    key={member.key}
                    type="button"
                    onClick={() => onOpen(member.key)}
                    aria-label={`${member.name}, ${member.caption}`}
                    className={`group/cell cursor-pointer ${cell}`}
                  >
                    {inner}
                  </button>
                ) : (
                  <div key={member.key} className={cell}>
                    {inner}
                  </div>
                )
              })}
            </div>
            {members.length < totalCount ? (
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" onClick={onShowMore}>
                  Show more
                </Button>
                <span className="text-sm text-fg2">
                  {num(members.length)} of {num(totalCount)}
                </span>
              </div>
            ) : null}
          </>
        ) : (
          <EmptyState>No registered members yet.</EmptyState>
        )}
      </section>
    </Card>
  )
}
