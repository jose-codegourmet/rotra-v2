'use client'

import { cn } from '@rotra/ui/cn'
import { useMediaQuery } from '@rotra/ui/hooks/use-media-query'
import { Icon } from '@rotra/ui/icon'
import { IconButton } from '@rotra/ui/icon-button'
import { useEffect, useId, useRef, useState } from 'react'

export type ClubSettingsSection =
  | 'identity'
  | 'defaults'
  | 'post'
  | 'license'
  | 'device'
  | 'account'

// The Queue prototype's CLUB_TABS.
const GROUPS: [string, [ClubSettingsSection, string][]][] = [
  [
    'Club',
    [
      ['identity', 'Club identity'],
      ['defaults', 'Session defaults'],
      ['post', 'Facebook post'],
    ],
  ],
  ['License', [['license', 'License and payments']]],
  ['This device', [['device', 'Downloads']]],
  ['Account', [['account', 'Account']]],
]

const LABEL = Object.fromEntries(GROUPS.flatMap(([, items]) => items)) as Record<
  ClubSettingsSection,
  string
>

/** Below this width the menu is a button that opens it as a left drawer. */
export const SETTINGS_DRAWER_QUERY = '(max-width: 760px)'

export type ClubSettingsMenuProps = {
  current: ClubSettingsSection
  onSelect: (section: ClubSettingsSection) => void
  onSignOut: () => void
  /** Phone drawer state; pass both to keep only one drawer open across the shell */
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

/**
 * The Club settings menu: grouped sections and Sign out, pinned beside the page on wide screens; on
 * phones a "☰ section · All settings" button that opens it as a left drawer.
 */
export function ClubSettingsMenu({
  current,
  onSelect,
  onSignOut,
  open: openProp,
  onOpenChange,
}: ClubSettingsMenuProps) {
  const phone = useMediaQuery(SETTINGS_DRAWER_QUERY)
  const [openState, setOpenState] = useState(false)
  const open = phone && (openProp ?? openState)
  const setOpen = (next: boolean) => {
    setOpenState(next)
    onOpenChange?.(next)
  }
  const menuId = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const navRef = useRef<HTMLElement>(null)
  const wasOpen = useRef(false)

  // Opening moves focus to the current section; closing returns it to the trigger.
  useEffect(() => {
    if (open) {
      navRef.current?.querySelector<HTMLElement>('[aria-current="page"]')?.focus()
    } else if (wasOpen.current) {
      triggerRef.current?.focus()
    }
    wasOpen.current = open
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  const linkClass =
    'flex w-full items-center justify-between gap-2 rounded-md border-0 bg-transparent px-3 py-2.5 text-left font-semibold hover:bg-elev'

  return (
    <>
      {phone ? (
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen(true)}
          aria-controls={menuId}
          aria-expanded={open}
          className="flex min-h-12 w-full items-center justify-between gap-2.5 rounded-lg border border-border-strong bg-surface px-3.5 py-2 font-bold text-fg shadow-card"
        >
          <span className="flex items-center gap-2.5">
            <Icon name="menu" />
            <span>{LABEL[current]}</span>
          </span>
          <span className="text-[13px] font-semibold text-fg2">All settings</span>
        </button>
      ) : null}
      {open ? (
        <div aria-hidden className="fixed inset-0 z-45 bg-scrim" onClick={() => setOpen(false)} />
      ) : null}
      <nav
        ref={navRef}
        id={menuId}
        aria-label="Club settings"
        inert={(phone && !open) || undefined}
        className={cn(
          'sticky top-[calc(64px+env(safe-area-inset-top,0px))] flex flex-col gap-3 rounded-lg border border-border bg-surface p-2.5 shadow-card',
          'max-[760px]:fixed max-[760px]:top-0 max-[760px]:bottom-0 max-[760px]:left-0 max-[760px]:z-46 max-[760px]:w-[min(290px,86vw)] max-[760px]:overflow-y-auto',
          'max-[760px]:rounded-none max-[760px]:px-2.5 max-[760px]:pt-[calc(14px+env(safe-area-inset-top,0px))] max-[760px]:pb-4 max-[760px]:shadow-drawer',
          'max-[760px]:transition-transform max-[760px]:duration-200 motion-reduce:transition-none',
          phone && !open ? 'max-[760px]:-translate-x-[102%]' : 'max-[760px]:translate-x-0',
        )}
      >
        {phone ? (
          <div className="flex items-center justify-between pr-1 pb-1.5 pl-3">
            <b>Club settings</b>
            <IconButton
              variant="ghost"
              size="xs"
              label="Close settings menu"
              onClick={() => setOpen(false)}
            >
              <Icon name="x" />
            </IconButton>
          </div>
        ) : null}
        {GROUPS.map(([group, items]) => (
          <div key={group} className="flex flex-col gap-0.5">
            <span className="px-3 py-1 text-xs font-semibold tracking-[0.5px] text-fg2 uppercase">
              {group}
            </span>
            {items.map(([key, label]) => (
              <button
                key={key}
                type="button"
                aria-current={key === current ? 'page' : undefined}
                onClick={() => {
                  onSelect(key)
                  setOpen(false)
                }}
                className={cn(
                  linkClass,
                  key === current && 'bg-accent-subtle text-accent hover:bg-accent-subtle',
                )}
              >
                <span>{label}</span>
              </button>
            ))}
          </div>
        ))}
        <button
          type="button"
          onClick={() => {
            setOpen(false)
            onSignOut()
          }}
          className={cn(
            linkClass,
            'mt-1 justify-start gap-2.5 rounded-t-none border-t border-border pt-3 text-error',
          )}
        >
          <Icon name="nav-logout" size={18} />
          <span>Sign out</span>
        </button>
      </nav>
    </>
  )
}
