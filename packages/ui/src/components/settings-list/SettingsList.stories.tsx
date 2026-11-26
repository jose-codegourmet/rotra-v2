import type { Meta, StoryObj } from '@storybook/react-vite'
import { useGlobals } from 'storybook/preview-api'
import { SettingsList } from './SettingsList'

const meta = {
  title: 'Player/SettingsList',
  component: SettingsList,
  decorators: [
    (Story) => (
      <div className="mx-auto max-w-[640px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SettingsList>

export default meta
type Story = StoryObj<typeof meta>

export const Account: Story = {
  args: {
    section: 'account',
    onEditProfile: () => {},
    onOpenPrivacy: () => {},
    onOpenVerification: () => {},
  },
}

export const ThisDevice: Story = {
  args: {
    section: 'device',
    darkMode: true,
    onDarkModeChange: () => {},
  },
  render: () => {
    const [globals, updateGlobals] = useGlobals()
    return (
      <SettingsList
        section="device"
        darkMode={globals.theme !== 'light'}
        onDarkModeChange={(checked) => updateGlobals({ theme: checked ? 'dark' : 'light' })}
      />
    )
  },
}
