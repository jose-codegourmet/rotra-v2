import type { Meta, StoryObj } from '@storybook/react-vite'
import { PlayerNameBlock } from './PlayerNameBlock'

const meta = {
  title: 'Queue/PlayerNameBlock',
  component: PlayerNameBlock,
  decorators: [
    (Story) => (
      <div className="w-[240px]">
        <Story />
      </div>
    ),
  ],
  args: { fullName: 'Miguel Santos', nickname: 'Migs', clubNickname: 'Migo' },
} satisfies Meta<typeof PlayerNameBlock>

export default meta
type Story = StoryObj<typeof meta>

/** Club nickname bold, then "Migs · Miguel Santos" */
export const ClubNickname: Story = {}
/** Only a nickname: it is bold, the full name sits under it */
export const NicknameOnly: Story = { args: { clubNickname: null } }
/** Neither: the full name only */
export const FullNameOnly: Story = { args: { nickname: null, clubNickname: null } }
export const LongName: Story = {
  args: { fullName: 'Maria Theresa Bautista Villareal de la Cruz', clubNickname: null },
}
export const ClubNicknameLight: Story = { globals: { theme: 'light' } }
export const FullNameOnlyLight: Story = { ...FullNameOnly, globals: { theme: 'light' } }
