'use client'

import { Avatar } from '@rotra/ui/avatar'
import { Button } from '@rotra/ui/button'
import { cn } from '@rotra/ui/cn'
import { Icon } from '@rotra/ui/icon'
import { ThemeToggle } from '@rotra/ui/theme-toggle'
import { DropdownMenu } from 'radix-ui'

export type PublicAccountViewer = {
  /** Full name: the menu header and the pill's accessible name */
  name: string
  /** First name or nickname, shown in the pill */
  shortName: string
  pictureUrl?: string
  /** The Player's RTR ID; the menu shows it and My ROTRA profile only when set */
  rtrId?: string
}

export type PublicAccountBarProps = {
  /** The signed-in ROTRA Player, or null for a visitor (Log in) */
  viewer: PublicAccountViewer | null
  /** The Player login that returns to this page */
  loginHref: string
  /** The Player's profile in ROTRA Player; opens in a new tab */
  profileHref: string
  onSignOut: () => void
  /** Sign out is running: the row is disabled so one tap cannot fire twice */
  signingOut?: boolean
}

const rowClass = cn(
  'flex min-h-11 w-full cursor-pointer flex-row items-center gap-3 rounded-sm px-2.5 py-2 text-left text-sm font-semibold no-underline outline-none',
  'data-highlighted:bg-accent-subtle',
  'data-disabled:cursor-not-allowed data-disabled:text-fg3',
)

/**
 * The session page's own top bar (the prototype's pubTopBar): ROTRA on the left; the theme toggle and
 * the ROTRA Player sign-in on the right. A visitor sees Log in; a signed-in Player sees a pill with
 * their picture and first name that opens a menu with their name and RTR ID, My ROTRA profile and
 * Sign out. Opening focuses the first row; ↑ / ↓ move; Escape or a click outside closes it and
 * returns focus to the pill.
 */
export function PublicAccountBar({
  viewer,
  loginHref,
  profileHref,
  onSignOut,
  signingOut = false,
}: PublicAccountBarProps) {
  return (
    <header className="sticky top-[env(safe-area-inset-top,0px)] z-20 border-b border-border bg-bg/92 backdrop-blur-[8px]">
      <div className="flex items-center gap-3 px-page py-2.5">
        <div
          role="img"
          aria-label="ROTRA"
          className="flex items-baseline gap-2 text-[17px] font-extrabold tracking-[1.5px]"
        >
          <span>
            ROTR<b className="text-accent">A</b>
          </span>
        </div>
        <div className="flex-1" />
        <ThemeToggle />
        {viewer ? (
          <DropdownMenu.Root modal={false}>
            <DropdownMenu.Trigger asChild>
              <button
                type="button"
                aria-label={`Signed in as ${viewer.name}. Account menu`}
                className={cn(
                  'inline-flex min-h-11 min-w-0 cursor-pointer items-center gap-2 rounded-full border border-border bg-surface py-1 pr-3 pl-1',
                  'text-sm font-semibold text-fg',
                  'hover:border-border-strong aria-expanded:border-border-strong',
                )}
              >
                <Avatar
                  name={viewer.name}
                  src={viewer.pictureUrl}
                  size={36}
                  className="size-8 text-xs"
                />
                <span className="max-w-[14ch] truncate">{viewer.shortName}</span>
                <Icon name="down" />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                loop
                onFocus={(event) => {
                  if (event.target !== event.currentTarget) return
                  const first = event.currentTarget.querySelector<HTMLElement>(
                    '[role="menuitem"]:not([data-disabled])',
                  )
                  first?.focus()
                }}
                aria-label="Account"
                align="end"
                sideOffset={4}
                collisionPadding={16}
                className="z-50 flex w-[272px] max-w-[calc(100vw-32px)] flex-col rounded-sm border border-border-strong bg-elev p-1.5 shadow-pop"
              >
                <DropdownMenu.Label className="flex items-center gap-3 px-2.5 pt-2.5 pb-3">
                  <Avatar
                    name={viewer.name}
                    src={viewer.pictureUrl}
                    size={40}
                    className="text-sm"
                  />
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <b className="truncate text-[15px] text-fg">{viewer.name}</b>
                    {viewer.rtrId ? (
                      <span className="truncate font-mono text-xs tracking-[0.2px] text-fg2">
                        {viewer.rtrId}
                      </span>
                    ) : null}
                  </span>
                </DropdownMenu.Label>
                <DropdownMenu.Separator className="mx-1.5 my-1 h-px bg-border" />
                {viewer.rtrId ? (
                  <DropdownMenu.Item asChild className={cn(rowClass, 'text-fg')}>
                    <a
                      href={profileHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="My ROTRA profile, opens in a new tab"
                    >
                      <Icon name="user" size={20} className="shrink-0 text-fg2" />
                      <span className="flex-1">My ROTRA profile</span>
                      <span className="inline-flex text-fg3">
                        <Icon name="external" size={16} />
                      </span>
                    </a>
                  </DropdownMenu.Item>
                ) : null}
                <DropdownMenu.Item
                  asChild
                  disabled={signingOut}
                  onSelect={onSignOut}
                  className={cn(rowClass, signingOut ? 'text-fg3' : 'text-error')}
                >
                  <button type="button" disabled={signingOut}>
                    <Icon
                      name="nav-logout"
                      className={cn('shrink-0', signingOut ? 'text-fg3' : 'text-error')}
                    />
                    <span className="flex-1">Sign out</span>
                  </button>
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        ) : (
          <Button asChild size="sm">
            <a href={loginHref} aria-label="Log in with ROTRA Player">
              Log in
            </a>
          </Button>
        )}
      </div>
    </header>
  )
}
