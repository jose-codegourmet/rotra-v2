import type { ClubPlayerDetails } from '@rotra/data/club-player/types'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { EditPlayerDetailsForm } from './EditPlayerDetailsForm'

const unclaimed: ClubPlayerDetails = {
  clubPlayerId: 'cp-1',
  identity: 'unclaimed',
  fullName: 'Faye Dimaculangan',
  nickname: null,
  phoneOnFile: false,
  profile: {
    email: '',
    playingStyle: '',
    experienceYears: 1,
    experienceMonths: 6,
    socialLinks: { facebook: '', instagram: '', youtube: '', linkedin: '' },
  },
}
const meta = {
  title: 'Queue/EditPlayerDetailsForm',
  component: EditPlayerDetailsForm,
  args: { open: true, onOpenChange: () => {}, onSubmit: () => {}, details: unclaimed },
} satisfies Meta<typeof EditPlayerDetailsForm>
export default meta
type Story = StoryObj<typeof meta>
export const UnclaimedNoPhone: Story = {}
export const UnclaimedPhoneOnFile: Story = {
  args: {
    details: {
      ...unclaimed,
      phoneOnFile: true,
      profile: { ...unclaimed.profile!, email: 'faye@example.com' },
    },
  },
}
export const Guest: Story = {
  args: {
    details: {
      clubPlayerId: 'cp-2',
      identity: 'guest',
      fullName: 'Tin Gonzaga',
      nickname: null,
      phoneOnFile: false,
      profile: null,
    },
  },
}
export const EmailTaken: Story = {
  args: {
    serverError: { message: 'This email belongs to another ROTRA account.', field: 'email' },
  },
}
export const Pending: Story = { args: { isPending: true } }
export const PhoneViewport: Story = { globals: { viewport: { value: 'phone' } } }
