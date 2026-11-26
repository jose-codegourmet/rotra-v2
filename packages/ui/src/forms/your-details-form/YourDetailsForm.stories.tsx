import { playerProfiles } from '@rotra/data/fixtures/player-profiles'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { YourDetailsForm } from './YourDetailsForm'
import { yourDetailsFromProfile } from './YourDetailsForm.defaultValues'

const profile = playerProfiles[0]
if (!profile) throw new Error('Missing profile fixture')
const meta = {
  title: 'Player/YourDetailsForm',
  component: YourDetailsForm,
  parameters: { layout: 'fullscreen' },
  args: {
    defaultValues: { ...yourDetailsFromProfile(profile), gender: 'male' },
    signInWith: 'jomar.delacruz@example.com',
    maskedPhone: '+63 9•• ••• 0142',
    onCancel: fn(),
    onSubmit: fn(),
  },
} satisfies Meta<typeof YourDetailsForm>

export default meta
type Story = StoryObj<typeof meta>

export const Prefilled: Story = {}
export const PrefilledLight: Story = { globals: { theme: 'light' } }
export const NoGenderYet: Story = { args: { defaultValues: yourDetailsFromProfile(profile) } }
export const Saving: Story = { args: { isPending: true } }
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
