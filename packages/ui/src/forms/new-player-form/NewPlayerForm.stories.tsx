import { storyIdentityPlayers } from '@rotra/data/fixtures/players'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn, within } from 'storybook/test'
import { NewPlayerForm, type NewPlayerFormProps } from './NewPlayerForm'

// A walk-in guest, typed in as a new player.
const guest = storyIdentityPlayers.guest

/** The session form's args, plus `club` to render the Saved players (no session) context. */
function Demo({
  club,
  ...props
}: Extract<NewPlayerFormProps, { context?: 'session' }> & { club?: boolean }) {
  return club ? (
    <NewPlayerForm {...props} context="club" onSubmit={props.onSubmit as never} />
  ) : (
    <NewPlayerForm {...props} />
  )
}

const meta = {
  title: 'Queue/NewPlayerForm',
  component: Demo,
  decorators: [
    (Story) => (
      <div className="max-w-[520px]">
        <Story />
      </div>
    ),
  ],
  args: { onSubmit: fn() },
} satisfies Meta<typeof Demo>

export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = {}

export const Valid: Story = {
  args: {
    defaultValues: {
      name: guest.fullName,
      nickname: guest.nickname ?? '',
      phone: '0917 123 4567',
      level: 'intermediate_mid',
    },
  },
}

/** Submitting with nothing filled in shows "Enter a name." and "Choose a level for this club." */
export const Invalid: Story = {
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement)
    await userEvent.click(await canvas.findByRole('button', { name: 'Confirm player slot' }))
  },
}

export const InvalidPhone: Story = {
  args: { defaultValues: { name: guest.fullName, phone: '123', level: 'beginner_mid' } },
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement)
    await userEvent.click(await canvas.findByRole('button', { name: 'Confirm player slot' }))
  },
}

export const Full: Story = { args: { full: true, defaultValues: { name: guest.fullName } } }

export const LiveSession: Story = { args: { live: true } }

export const Pending: Story = {
  args: { isPending: true, defaultValues: { name: guest.fullName, level: 'intermediate_low' } },
}

export const ServerError: Story = {
  args: {
    serverError: 'This player is already on the roster or waitlist.',
    defaultValues: { name: guest.fullName, level: 'intermediate_low' },
  },
}

/** Saved players › Add player: no session, the level is optional and the submit reads Save player. */
export const SavedPlayersClub: Story = { args: { club: true } }
/** Club context with only a name: it saves with no level (no level error). */
export const SavedPlayersClubNoLevel: Story = {
  args: { club: true, defaultValues: { name: guest.fullName } },
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement)
    await userEvent.click(await canvas.findByRole('button', { name: 'Save player' }))
  },
}

export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
