import { type RailGroup, type RailItem, SideRail } from '@rotra/ui/app-shell/side-rail'
import { Icon, type IconName } from '@rotra/ui/icon'
import type { ElementType } from 'react'

export type AdminNavKey =
  | 'clubs'
  | 'players'
  | 'contact-changes'
  | 'club-names'
  | 'ranking'
  | 'feature-flags'
export type AdminNavProps = {
  current: AdminNavKey | null
  hrefs: Record<AdminNavKey, string>
  linkComponent?: ElementType
  /**
   * While set, items report the chosen href instead of following it, so the shell can ask before
   * leaving an unsaved draft (rotra-admin.html go() with cfgDirty)
   */
  onNavigate?: (href: string) => void
  counts?: Partial<Record<AdminNavKey, number>>
  accountEmail: string
  onSignOut: () => void
  isSigningOut?: boolean
}

/** Reuses the Foundation rail, including drawer focus, Escape and navigation dismissal. */
export function AdminNav({
  current,
  hrefs,
  linkComponent,
  onNavigate,
  counts,
  accountEmail,
  onSignOut,
  isSigningOut,
}: AdminNavProps) {
  const item = (id: AdminNavKey, label: string, icon: IconName, hot = false): RailItem => ({
    id,
    label,
    icon,
    ...(onNavigate ? { onSelect: () => onNavigate(hrefs[id]) } : { href: hrefs[id] }),
    current: current === id,
    count: id === 'ranking' ? undefined : counts?.[id],
    hot,
  })
  const groups: RailGroup[] = [
    {
      items: [
        item('clubs', 'Clubs and licenses', 'nav-club'),
        item('players', 'Players', 'nav-players'),
      ],
    },
    {
      label: 'Requests',
      items: [
        item('contact-changes', 'Contact changes', 'nav-contact', true),
        item('club-names', 'Club names', 'nav-name', true),
      ],
    },
    {
      label: 'Settings',
      items: [
        item('ranking', 'Ranking', 'nav-rank'),
        item('feature-flags', 'Feature flags', 'nav-flag'),
      ],
    },
  ]
  return (
    <SideRail
      aria-label="Admin"
      groups={groups}
      linkAs={linkComponent}
      footer={
        <>
          <p className="px-3 pt-1.5 pb-2 text-xs text-fg2 [overflow-wrap:anywhere]">
            Signed in as
            <br />
            <b>{accountEmail}</b>
          </p>
          <button
            type="button"
            disabled={isSigningOut}
            onClick={onSignOut}
            className="flex min-h-[42px] touch:min-h-12 items-center gap-3 rounded-md px-3 py-[9px] text-left font-semibold text-fg2 hover:bg-elev hover:text-fg disabled:opacity-45"
          >
            <Icon name="nav-out" />
            {isSigningOut ? 'Signing out…' : 'Sign out'}
          </button>
        </>
      }
    />
  )
}
