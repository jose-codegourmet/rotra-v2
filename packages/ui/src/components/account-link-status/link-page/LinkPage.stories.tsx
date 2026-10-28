import { claimLinkScenarios } from '@rotra/data/fixtures/player-accounts'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { LinkPage } from './LinkPage'

const meta = {
  title: 'Player/AccountLinkStatus/LinkPage',
  component: LinkPage,
  args: {
    label: `Registration link from ${claimLinkScenarios.clubName}`,
    title: 'Is this you?',
    description: `${claimLinkScenarios.clubName} added this profile for you. Check it's yours before you set a password.`,
  },
} satisfies Meta<typeof LinkPage>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const LongClubName: Story = {
  args: { label: `Registration link from ${claimLinkScenarios.longClubName}` },
}
