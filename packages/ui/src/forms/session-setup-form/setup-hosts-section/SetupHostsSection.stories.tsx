import type { Meta, StoryObj } from '@storybook/react-vite'
import { FormProvider, useForm } from 'react-hook-form'
import { fn } from 'storybook/test'
import { sessionSetupDefaultValues } from '../SessionSetupForm.defaultValues'
import {
  type HostPlacementRule,
  type SetupHostPerson,
  SetupHostsSection,
} from './SetupHostsSection'

// The rule from @rotra/data/session-host/rules, inlined for the story.
const placement: HostPlacementRule = ({ capacity, rosterCount, needingPlace }) => {
  const slots = Math.min(needingPlace, Math.max(0, capacity - rosterCount))
  return { slots, waitlisted: needingPlace - slots }
}

const people: SetupHostPerson[] = [
  {
    clubPlayerId: 'p1',
    name: 'Miguel Santos',
    nickname: 'Migs',
    identity: 'registered',
    trusted: true,
  },
  { clubPlayerId: 'p17', name: 'Gab Torres', identity: 'unclaimed', trusted: true },
  { clubPlayerId: 'p2', name: 'Bea Castillo', identity: 'registered', trusted: false },
  { clubPlayerId: 'p8', name: 'Lia Bautista', identity: 'guest', trusted: false },
  { clubPlayerId: 'p3', name: 'Jomar dela Cruz', identity: 'unclaimed', trusted: false },
]

function Demo({
  hosts,
  courts = 2,
  rosterCount,
  editing,
  savedHostIds,
  list = people,
}: {
  hosts: string[]
  courts?: number
  rosterCount?: number
  editing?: boolean
  savedHostIds?: string[]
  list?: SetupHostPerson[]
}) {
  const form = useForm({
    defaultValues: {
      ...sessionSetupDefaultValues(),
      courtLabels: Array.from({ length: courts }, (_, i) => `Court ${i + 1}`),
      hostClubPlayerIds: hosts,
    },
  })
  return (
    <FormProvider {...form}>
      <div className="flex max-w-xl flex-col gap-4">
        <SetupHostsSection
          people={list}
          savedHostIds={savedHostIds}
          rosterCount={rosterCount}
          editing={editing}
          placement={placement}
          onTrust={async () => {}}
        />
      </div>
    </FormProvider>
  )
}

const meta = {
  title: 'Queue/SetupHostsSection',
  component: SetupHostsSection,
  args: { people, placement, onTrust: fn() },
} satisfies Meta<typeof SetupHostsSection>
export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = { render: () => <Demo hosts={[]} /> }
/** Two hosts on a new session: 2 of 16 slots */
export const TwoHosts: Story = { render: () => <Demo hosts={['p1', 'p17']} /> }
export const TwoHostsLight: Story = { ...TwoHosts, globals: { theme: 'light' } }
/** Editing a session with one slot left: the second new host goes on the waitlist */
export const PastOpenSlots: Story = {
  render: () => (
    <Demo
      hosts={['p1', 'p17', 'p2']}
      editing
      rosterCount={15}
      list={people.map((p) => (p.clubPlayerId === 'p2' ? { ...p, registration: 'slot' } : p))}
    />
  ),
}
export const PastOpenSlotsLight: Story = { ...PastOpenSlots, globals: { theme: 'light' } }
/** Editing: Miguel is a saved host already; nothing new needs a slot */
export const EditingKept: Story = {
  render: () => <Demo hosts={['p1']} editing rosterCount={10} savedHostIds={['p1']} />,
}
export const Phone: Story = { ...TwoHosts, globals: { viewport: { value: 'phone' } } }
