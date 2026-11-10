import type { ClubPlayerDetails, ClubPlayerPictureState } from '@rotra/data/club-player/types'
import { profileCharacterUrl } from '@rotra/ui/profile-picture'
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
const photo = (fill: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="${fill}"/><circle cx="32" cy="26" r="11" fill="#f3cfae"/><path d="M10 64C12 48 22 42 32 42S52 48 54 64Z" fill="#24242a"/></svg>`,
  )}`
const initialsPicture: ClubPlayerPictureState = {
  kind: 'initials',
  reference: null,
  characterId: null,
  previousSrc: null,
}
const guestDetails: ClubPlayerDetails = {
  clubPlayerId: 'cp-2',
  identity: 'guest',
  fullName: 'Tin Gonzaga',
  nickname: null,
  phoneOnFile: false,
  profile: null,
}
const manyCharacters = Array.from({ length: 24 }, (_, index) => ({
  id: `c${index}`,
  image: profileCharacterUrl('cp-2', 'Tin Gonzaga', `c${index}`),
}))
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
export const GuestInitials: Story = {
  args: { details: guestDetails, picture: initialsPicture },
}
export const GuestCharacterChosen: Story = {
  args: {
    details: guestDetails,
    picture: { ...initialsPicture, kind: 'character', reference: 'character:b', characterId: 'b' },
  },
}
export const GuestPhoto: Story = {
  args: {
    details: guestDetails,
    picture: { ...initialsPicture, kind: 'photo', reference: photo('#3b4f8a') },
  },
}
export const GuestPhotoWithPrevious: Story = {
  args: {
    details: guestDetails,
    picture: {
      ...initialsPicture,
      kind: 'photo',
      reference: photo('#3b4f8a'),
      previousSrc: photo('#8a5a2f'),
    },
  },
}
export const GuestAfterRemove: Story = {
  args: { details: guestDetails, picture: { ...initialsPicture, previousSrc: photo('#3b4f8a') } },
}
export const UnclaimedSamplePicture: Story = {
  args: {
    picture: { ...initialsPicture, kind: 'photo', reference: photo('#74488a') },
  },
}
export const ManyCharactersPaged: Story = {
  args: {
    details: guestDetails,
    characters: manyCharacters,
    picture: {
      ...initialsPicture,
      kind: 'character',
      reference: 'character:c10',
      characterId: 'c10',
    },
  },
}
export const PictureError: Story = {
  args: {
    details: guestDetails,
    picture: initialsPicture,
    pictureError: 'That image could not be read',
  },
}
export const EmailTaken: Story = {
  args: {
    serverError: { message: 'This email belongs to another ROTRA account.', field: 'email' },
  },
}
export const Pending: Story = { args: { isPending: true } }
export const PhoneViewport: Story = { globals: { viewport: { value: 'phone' } } }
