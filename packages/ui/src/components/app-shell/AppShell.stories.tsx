import { BottomDock } from '@rotra/ui/app-shell/bottom-dock'
import { type RailGroup, SideRail } from '@rotra/ui/app-shell/side-rail'
import { TopBar } from '@rotra/ui/app-shell/top-bar'
import { Breadcrumb } from '@rotra/ui/breadcrumb'
import { Button } from '@rotra/ui/button'
import { Icon } from '@rotra/ui/icon'
import { PageHeader } from '@rotra/ui/page-header'
import { SyncStatus } from '@rotra/ui/sync-status'
import { ThemeProvider } from '@rotra/ui/theme-provider'
import { ThemeToggle } from '@rotra/ui/theme-toggle'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { AppShell } from './AppShell'

// The Queue prototype's rail (navRail) with its counts.
const QUEUE_NAV: RailGroup[] = [
  {
    items: [
      { id: 'live', label: 'Live session', icon: 'nav-live', live: true },
      { id: 'dash', label: 'Dashboard', icon: 'nav-home', current: true },
      { id: 'players', label: 'Saved players', icon: 'nav-users', count: 20 },
      { id: 'venues', label: 'Venues', icon: 'nav-pin', count: 3 },
      { id: 'inventory', label: 'Inventory', icon: 'nav-box', count: 6 },
      { id: 'club', label: 'Club settings', icon: 'nav-gear' },
      { id: 'license', label: 'License', icon: 'nav-card' },
      { id: 'device', label: 'This device', icon: 'nav-device' },
    ],
  },
]

// The Admin prototype's rail: groups, a hot count and the signed-in footer.
const ADMIN_NAV: RailGroup[] = [
  {
    items: [
      { id: 'clubs', label: 'Clubs and licenses', icon: 'nav-club', count: 4, current: true },
      { id: 'players', label: 'Players', icon: 'nav-players', count: 128 },
    ],
  },
  {
    label: 'Requests',
    items: [
      { id: 'contact', label: 'Contact changes', icon: 'nav-contact', count: 2, hot: true },
      { id: 'names', label: 'Club names', icon: 'nav-name', count: 0, hot: true },
    ],
  },
  {
    label: 'Settings',
    items: [
      { id: 'ranking', label: 'Ranking', icon: 'nav-rank' },
      { id: 'flags', label: 'Feature flags', icon: 'nav-flag', count: 3 },
    ],
  },
]

function Page() {
  return (
    <main className="mx-auto flex max-w-[1240px] flex-col gap-5 px-4 pt-5 pb-[120px]">
      <Breadcrumb label="Home" onClick={() => {}} />
      <PageHeader
        title="Saved players"
        description="Players your club has added. Search by name or RTR ID."
        actions={
          <>
            <Button size="sm">Invite</Button>
            <Button size="sm" variant="primary">
              Add player
            </Button>
          </>
        }
      />
    </main>
  )
}

function QueueShell() {
  return (
    <ThemeProvider storageKey="storybook-theme">
      <AppShell
        topBar={
          <TopBar product="Queue">
            <SyncStatus state="synced" lastSyncedAt="7:42 PM" onOpen={() => {}} />
            <ThemeToggle />
          </TopBar>
        }
        rail={<SideRail aria-label="Club navigation" groups={QUEUE_NAV} />}
        dock={
          <BottomDock
            main={{ label: 'Continue session', icon: 'nav-live', onClick: () => {} }}
            end={{ label: 'Settings', icon: 'nav-gear', onClick: () => {} }}
          />
        }
      >
        <Page />
      </AppShell>
    </ThemeProvider>
  )
}

function AdminShell() {
  return (
    <ThemeProvider storageKey="storybook-theme">
      <AppShell
        railWidth={236}
        topBar={
          <TopBar product="Admin" onBrandClick={() => {}} contained={false}>
            <ThemeToggle />
          </TopBar>
        }
        rail={
          <SideRail
            aria-label="Admin"
            groups={ADMIN_NAV}
            footer={
              <>
                <div className="px-3 pt-1.5 pb-2 text-xs text-fg2">
                  Signed in as
                  <br />
                  <b>owner@rotra.example</b>
                </div>
                <button
                  type="button"
                  className="flex min-h-[42px] items-center gap-3 rounded-md border-0 bg-transparent px-3 font-semibold text-fg2 hover:bg-elev hover:text-fg"
                >
                  <Icon name="nav-out" />
                  Sign out
                </button>
              </>
            }
          />
        }
      >
        <Page />
      </AppShell>
    </ThemeProvider>
  )
}

const meta = {
  title: 'Shared/AppShell',
  component: AppShell,
  parameters: { layout: 'fullscreen' },
  args: { topBar: null, rail: null, children: null },
} satisfies Meta<typeof AppShell>

export default meta
type Story = StoryObj<typeof meta>

export const QueueDesktop: Story = { render: () => <QueueShell /> }
export const QueuePhone: Story = {
  render: () => <QueueShell />,
  globals: { viewport: { value: 'phone' } },
}
export const AdminDesktop: Story = { render: () => <AdminShell /> }
export const AdminPhone: Story = {
  render: () => <AdminShell />,
  globals: { viewport: { value: 'phone' } },
}
