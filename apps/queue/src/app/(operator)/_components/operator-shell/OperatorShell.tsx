'use client'

import { useClubPlayers } from '@rotra/data/club-player/useClubPlayers'
import { useClubVenues } from '@rotra/data/club-venue/useClubVenues'
import { useNowCard } from '@rotra/data/queue-session/useNowCard'
import { useSyncState } from '@rotra/data/sync/useSyncState'
import { AppShell, useAppShell } from '@rotra/ui/app-shell'
import { BottomDock, type DockAction } from '@rotra/ui/app-shell/bottom-dock'
import { type RailGroup, SideRail } from '@rotra/ui/app-shell/side-rail'
import { TopBar } from '@rotra/ui/app-shell/top-bar'
import { type SyncState, SyncStatus } from '@rotra/ui/sync-status'
import { ThemeToggle } from '@rotra/ui/theme-toggle'
import { toast } from '@rotra/ui/toaster'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DevTools } from '@/providers/DevTools'
import { DEV_TOOLS_ENABLED } from '@/providers/devToolsEnabled'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { selectNavCollapsed, setNavCollapsed } from '@/store/slices/uiSlice'
import { OperatorShellContext, type OperatorShellContextValue } from './DockAction.context'

/** Per-device memory of the collapsed rail, as the prototype keeps it. */
const NAV_STORAGE_KEY = 'rotra-queue-nav'

const timeOf = (at: number) =>
  new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

/** Closes the settings drawer when the main nav drawer opens, so only one is open at a time. */
function DrawerCoordinator({ onNavOpen }: { onNavOpen: () => void }) {
  const shell = useAppShell()
  useEffect(() => {
    if (shell.drawerOpen) onNavOpen()
  }, [shell.drawerOpen, onNavOpen])
  return null
}

/**
 * The signed-in operator layout: top bar (burger, wordmark, sync pill, theme switch), the left nav
 * with counts and the live session, and the phone dock whose centre pill pages can override.
 */
export function OperatorShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const dispatch = useAppDispatch()
  const collapsed = useAppSelector(selectNavCollapsed)
  const sync = useSyncState()
  const nowCard = useNowCard()
  const players = useClubPlayers()
  const venues = useClubVenues()
  const [dockOverride, setDockOverride] = useState<DockAction | null>(null)
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false)

  // Remembered rail state (try/catch: storage may be unavailable).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(NAV_STORAGE_KEY)
      if (saved === 'collapsed') dispatch(setNavCollapsed(true))
    } catch {}
  }, [dispatch])
  const onCollapsedChange = useCallback(
    (next: boolean) => {
      dispatch(setNavCollapsed(next))
      try {
        localStorage.setItem(NAV_STORAGE_KEY, next ? 'collapsed' : 'expanded')
      } catch {}
    },
    [dispatch],
  )

  // "Synced N changes" once a reconnect has pushed the changes that waited on this device.
  const previousPending = useRef(0)
  useEffect(() => {
    const data = sync.data
    if (!data) return
    if (previousPending.current > 0 && data.pendingCount === 0 && data.online && !data.syncing) {
      const n = previousPending.current
      toast(`Synced ${n} change${n === 1 ? '' : 's'}`)
    }
    previousPending.current = data.pendingCount
  }, [sync.data])

  const live = nowCard.data?.live
  const syncState: SyncState = !sync.data
    ? 'synced'
    : !sync.data.online
      ? 'offline'
      : sync.data.syncing
        ? 'syncing'
        : 'synced'

  const current = (prefix: string) =>
    prefix === '/' ? pathname === '/' : pathname === prefix || pathname.startsWith(`${prefix}/`)
  const settingsCurrent =
    current('/club-settings') &&
    !current('/club-settings/license') &&
    !current('/club-settings/this-device')

  const groups: RailGroup[] = [
    {
      items: [
        ...(live
          ? [
              {
                id: 'live',
                label: 'Live session',
                icon: 'nav-live' as const,
                live: true,
                href: `/sessions/${live.id}`,
                current: current(`/sessions/${live.id}`),
              },
            ]
          : []),
        { id: 'dash', label: 'Dashboard', icon: 'nav-home', href: '/', current: current('/') },
        {
          id: 'players',
          label: 'Saved players',
          icon: 'nav-users',
          count: players.data?.players.length,
          href: '/saved-players',
          current: current('/saved-players'),
        },
        {
          id: 'venues',
          label: 'Venues',
          icon: 'nav-pin',
          count: venues.data?.length,
          href: '/venues',
          current: current('/venues'),
        },
        {
          id: 'club',
          label: 'Club settings',
          icon: 'nav-gear',
          href: '/club-settings/club-identity',
          current: settingsCurrent,
        },
        {
          id: 'license',
          label: 'License',
          icon: 'nav-card',
          href: '/club-settings/license',
          current: current('/club-settings/license'),
        },
        {
          id: 'device',
          label: 'This device',
          icon: 'nav-device',
          href: '/club-settings/this-device',
          current: current('/club-settings/this-device'),
        },
      ],
    },
  ]

  const defaultDock: DockAction = live
    ? {
        label: 'Continue session',
        icon: 'nav-live',
        onClick: () => router.push(`/sessions/${live.id}`),
      }
    : { label: 'Create session', icon: 'plus', onClick: () => router.push('/sessions/new') }

  const closeSettings = useCallback(() => setSettingsMenuOpen(false), [])
  const context = useMemo<OperatorShellContextValue>(
    () => ({ setDockAction: setDockOverride, settingsMenuOpen, setSettingsMenuOpen }),
    [settingsMenuOpen],
  )

  return (
    <OperatorShellContext.Provider value={context}>
      <AppShell
        collapsed={collapsed}
        onCollapsedChange={onCollapsedChange}
        topBar={
          <TopBar product="Queue">
            <SyncStatus
              state={syncState}
              pending={sync.data?.pendingCount}
              lastSyncedAt={sync.data ? timeOf(sync.data.lastSyncedAt) : undefined}
            />
            <ThemeToggle />
            {DEV_TOOLS_ENABLED ? <DevTools /> : null}
          </TopBar>
        }
        rail={<SideRail aria-label="Club navigation" groups={groups} linkAs={Link} />}
        dock={
          <BottomDock
            main={dockOverride ?? defaultDock}
            end={{
              label: 'Settings',
              icon: 'nav-gear',
              current: current('/club-settings'),
              onClick: () => router.push('/club-settings/club-identity'),
            }}
          />
        }
      >
        <DrawerCoordinator onNavOpen={closeSettings} />
        {children}
      </AppShell>
    </OperatorShellContext.Provider>
  )
}
