import { decidedJoinRequests, joinRequests } from '@rotra/data/fixtures/joinRequests'
import { playerProfiles } from '@rotra/data/fixtures/player-profiles'
import { Button } from '@rotra/ui/button'
import { Sheet } from '@rotra/ui/sheet'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { fn } from 'storybook/test'
import { JoinRequestsPanel } from './JoinRequestsPanel'

const history = decidedJoinRequests.filter((r) => r.status !== 'pending')

const meta = {
  title: 'Queue/JoinRequestsPanel',
  component: JoinRequestsPanel,
  decorators: [
    (Story) => (
      <div className="max-w-2xl">
        <Story />
      </div>
    ),
  ],
  args: { requests: joinRequests, onConfirm: fn(), onDecline: fn() },
} satisfies Meta<typeof JoinRequestsPanel>

export default meta
type Story = StoryObj<typeof meta>

const dropOuts = [
  { id: 'drop', name: 'Paolo Reyes', timeLabel: '7:20 PM', onRemove: fn(), onKeep: fn() },
]
const matchRequests = [
  {
    id: 'match',
    requesterName: 'Miguel Santos',
    formatLabel: '2 v 2 doubles',
    requestedLabel: '7:21 PM',
    spots: [
      {
        role: 'Requester' as const,
        player: {
          name: 'Miguel Santos',
          games: 3,
          minimumGames: 4,
          level: 'advanced_low' as const,
        },
      },
      { role: 'Partner' as const },
      { role: 'Opponent' as const },
      { role: 'Opponent' as const },
    ],
    onDecline: fn(),
    onAddToQueue: fn(),
  },
]
/** The prototype's four sample guests: Tracy, Gretchen, PJ Perez, Jess. */
export const FourGuests: Story = {}
export const SlotsFull: Story = { args: { slotsFull: true } }
/** Jess said "Not sure", so the level is empty; Confirm guest shows the error. */
export const LevelError: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Confirm guest Jess' }))
  },
}
export const EmptyWithHistory: Story = { args: { requests: history } }
export const EmptyNoHistory: Story = { args: { requests: [] } }
/** Requests still loading: Skeleton rows, never fake names. */
export const Loading: Story = { args: { requests: [], loading: true } }
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }

function SheetDemo({
  slotsFull,
  loading,
  live,
}: {
  slotsFull?: boolean
  loading?: boolean
  live?: boolean
}) {
  const [open, setOpen] = useState(true)
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        {live ? `Match requests · ${matchRequests.length}` : `Requests · ${joinRequests.length}`}
      </Button>
      <Sheet
        open={open}
        onOpenChange={setOpen}
        title="Requests"
        wide
        footer={<Button onClick={() => setOpen(false)}>Done</Button>}
      >
        <JoinRequestsPanel
          variant="sheet"
          loading={loading}
          requests={joinRequests}
          slotsFull={slotsFull}
          live={live}
          matchRequests={matchRequests}
          onConfirm={fn()}
          onDecline={fn()}
        />
      </Sheet>
    </>
  )
}

/** The Requests sheet before Start: same list, no card chrome, the sheet title names it. */
export const InSheet: Story = { render: () => <SheetDemo /> }
/** The live console's Requests sheet: match requests only. */
export const InSheetLive: Story = { render: () => <SheetDemo live /> }
export const InSheetLiveLight: Story = {
  render: () => <SheetDemo live />,
  globals: { theme: 'light' },
}
export const InSheetLivePhone: Story = {
  render: () => <SheetDemo live />,
  globals: { viewport: { value: 'phone' } },
}
export const InSheetLoading: Story = { render: () => <SheetDemo loading /> }
export const InSheetPhone: Story = {
  render: () => <SheetDemo slotsFull />,
  globals: { viewport: { value: 'phone' } },
}

const firstId = joinRequests[0]?.id ?? ''
const secondId = joinRequests[1]?.id ?? ''
export const WithDropOuts: Story = { args: { dropOuts } }
const pictured = playerProfiles.find((p) => p.picture)
/** Two signed-in Players: the first shows their profile picture, the second has none (initials). */
export const PlayerRequests: Story = {
  args: {
    requests: joinRequests.map((r, i) =>
      i === 0 && pictured
        ? {
            ...r,
            name: pictured.fullName,
            playerId: pictured.playerId,
            picture: pictured.picture,
            pictureName: pictured.fullName,
          }
        : i === 1
          ? { ...r, playerId: 'story-player-no-picture' }
          : r,
    ),
    requestDetails: {
      [firstId]: { account: 'in-club', sharedRank: 'Intermediate Mid', invitedBy: 'Miguel Santos' },
      [secondId]: { account: 'new-to-club', sharedRank: null },
    },
  },
}
/** D-2026-11-11-02: one asks for a slot, one asks to be waitlisted, Derrick asks for a slot from waitlist #2. */
export const Placements: Story = {
  args: {
    requests: joinRequests.map((r, i) =>
      i === 1
        ? { ...r, placement: 'waitlist' }
        : i === 2
          ? { ...r, placement: 'from_waitlist', playerId: 'story-player-waitlisted' }
          : r,
    ),
    requestDetails: {
      [joinRequests[2]?.id ?? '']: {
        account: 'in-club',
        sharedRank: 'Advanced Mid',
        waitlistPosition: 2,
      },
    },
  },
}
export const PlacementsLight: Story = { ...Placements, globals: { theme: 'light' } }
export const PhoneMatch: Story = {
  args: {
    requestDetails: {
      [firstId]: { phoneMatch: { name: 'Kiko Salazar', onLink: fn(), onNotThem: fn() } },
    },
  },
}
export const PhoneLinked: Story = {
  args: {
    requestDetails: {
      [firstId]: {
        phoneMatch: { name: 'Kiko Salazar', linked: true, onLink: fn(), onNotThem: fn() },
      },
    },
  },
}
/** Live: no tabs, match requests only, with the match-request intro. */
export const LiveMatchRequests: Story = { args: { live: true, matchRequests, dropOuts } }
export const LiveNoMatchRequests: Story = { args: { live: true, requests: [] } }
export const LiveServerError: Story = {
  args: { live: true, matchRequests, serverError: 'Changes could not be saved' },
}
export const WithDropOutsLight: Story = { ...WithDropOuts, globals: { theme: 'light' } }
export const PlayerRequestsLight: Story = { ...PlayerRequests, globals: { theme: 'light' } }
export const PhoneMatchLight: Story = { ...PhoneMatch, globals: { theme: 'light' } }
export const PhoneLinkedLight: Story = { ...PhoneLinked, globals: { theme: 'light' } }
export const LiveMatchRequestsLight: Story = { ...LiveMatchRequests, globals: { theme: 'light' } }
export const LiveNoMatchRequestsLight: Story = {
  ...LiveNoMatchRequests,
  globals: { theme: 'light' },
}
export const FourGuestsLight: Story = { globals: { theme: 'light' } }
export const LiveMatchRequestsPhone: Story = {
  ...LiveMatchRequests,
  globals: { viewport: { value: 'phone' } },
}
export const SlotsFullLight: Story = { ...SlotsFull, globals: { theme: 'light' } }
export const LevelErrorLight: Story = { ...LevelError, globals: { theme: 'light' } }
export const InSheetLight: Story = { ...InSheet, globals: { theme: 'light' } }
