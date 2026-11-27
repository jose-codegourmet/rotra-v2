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

/** Stack (pickers, Players cards): each name on its own smaller line, the second fg2 and the third fg3 */
export const Stack: Story = { args: { layout: 'stack' } }
export const StackNicknameOnly: Story = { args: { layout: 'stack', clubNickname: null } }
export const StackFullNameOnly: Story = {
  args: { layout: 'stack', fullName: 'Ysa Fernandez', nickname: null, clubNickname: null },
}
export const StackLight: Story = { ...Stack, globals: { theme: 'light' } }
/** Face on a queue card: with no nicknames the label is the first name, the full name under it */
export const FacePlain: Story = {
  args: {
    layout: 'face',
    tone: 'plain',
    fullName: 'Ysa Fernandez',
    nickname: null,
    clubNickname: null,
  },
  decorators: [
    (Story) => (
      <div className="w-[96px]">
        <Story />
      </div>
    ),
  ],
}
export const FacePlainClubNickname: Story = {
  ...FacePlain,
  args: { layout: 'face', tone: 'plain' },
}
export const FacePlainLight: Story = { ...FacePlainClubNickname, globals: { theme: 'light' } }
/** Face on a court drawing: the smaller lines sit in the dark pill and hide when the court is 240 px or narrower */
export const FacePhoto: Story = {
  args: { layout: 'face', tone: 'photo' },
  decorators: [
    (Story) => (
      <div className="@container w-[300px] rounded-md bg-court p-4">
        <Story />
      </div>
    ),
  ],
}
export const FacePhotoNarrow: Story = {
  ...FacePhoto,
  decorators: [
    (Story) => (
      <div className="@container w-[220px] rounded-md bg-court p-4">
        <Story />
      </div>
    ),
  ],
}
export const FacePhotoLight: Story = { ...FacePhoto, globals: { theme: 'light' } }
