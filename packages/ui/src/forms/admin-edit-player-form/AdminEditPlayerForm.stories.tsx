import type { AdminPlayerEdit } from '@rotra/data/admin-player/types'
import { managementPlayer } from '@rotra/data/fixtures/admin-player-management'
import { profileCharacters } from '@rotra/data/fixtures/profile-characters'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn, within } from 'storybook/test'
import { AdminEditPlayerForm } from './AdminEditPlayerForm'

const characters = profileCharacters
  .filter((c) => c.shown)
  .map(({ id, image, number }) => ({ id, image, number }))

/** An unclaimed player a club entered: no password to replace. */
const unclaimed: AdminPlayerEdit = {
  ...managementPlayer,
  phone: '+639171234567',
  playingStyle: '',
  experienceYears: null,
  experienceMonths: null,
  socialLinks: { facebook: '', instagram: '', youtube: '', linkedin: '' },
  profilePrivate: false,
  previousPicture: null,
  hasAccount: true,
  passwordSetAt: null,
}

/** A registered player with a character picture, a previous photo and an Admin-set password. */
const registered: AdminPlayerEdit = {
  ...unclaimed,
  id: 'admin-demo-story-registered',
  name: 'Mikee Abellana',
  nickname: 'Mikee',
  claimed: true,
  registeredOn: '2026-03-15',
  email: 'mikee.abellana@example.com',
  picture: `character:${characters[2]?.id ?? ''}`,
  previousPicture: characters[5]?.image ?? null,
  levelIndex: 6,
  recentStandardMatches: 9,
  rankStatus: { kind: 'below', text: 'Intermediate Low · 9 of 10 recent matches' },
  playingStyle: 'Fast at the net, steady from the back. Likes to play doubles.',
  experienceYears: 3,
  experienceMonths: 4,
  socialLinks: {
    facebook: 'https://facebook.com/mikee.abellana',
    instagram: 'https://instagram.com/mikee_abellana',
    youtube: '',
    linkedin: '',
  },
  passwordSetAt: '2026-11-08T06:30:00Z',
}

const meta = {
  title: 'Admin/AdminEditPlayerForm',
  component: AdminEditPlayerForm,
  args: {
    player: registered,
    characters,
    createdBy: 'Admin',
    // The container crops; the story answers with a library image.
    cropPhoto: fn(async () => characters[0]?.image ?? ''),
    onSubmit: fn(),
    onNothingChanged: fn(),
    onReload: fn(),
  },
  decorators: [
    (Story) => (
      <div className="max-w-[440px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AdminEditPlayerForm>
export default meta
type Story = StoryObj<typeof meta>

export const Registered: Story = {}
export const RegisteredLight: Story = { globals: { theme: 'light' } }

/** Password is off with "This player hasn't registered, so there's no password to replace." */
export const Unclaimed: Story = { args: { player: unclaimed, createdBy: 'Smash Club Cebu' } }
export const UnclaimedLight: Story = { ...Unclaimed, globals: { theme: 'light' } }

/** The data layer's field errors, inline; the first one is focused. */
export const FieldErrors: Story = {
  args: {
    fieldErrors: {
      name: 'Keep the name under 60 characters.',
      experienceMonths: 'Use 0 to 11 months.',
      facebook: 'Use a Facebook link, like https://facebook.com/name.',
      phone: 'This phone number is already linked to another player.',
      email: 'This email is already linked to another player.',
      password: 'Use at least 8 characters, or leave it empty to keep the current password.',
      reason: 'Say why you are making this change.',
    },
  },
}
export const FieldErrorsLight: Story = { ...FieldErrors, globals: { theme: 'light' } }

/** Save changes with a change and no reason, a bad link, no email and a bad Playing since year. */
export const ReasonMissing: Story = {
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement)
    await userEvent.type(canvas.getByRole('textbox', { name: 'Nickname' }), '!')
    await userEvent.clear(canvas.getByRole('textbox', { name: 'Email' }))
    await userEvent.type(canvas.getByRole('textbox', { name: 'YouTube' }), 'https://example.com/x')
    const year = canvas.getByRole('textbox', { name: 'Year' })
    await userEvent.clear(year)
    await userEvent.type(year, '20')
    canvasElement.querySelector('form')?.requestSubmit()
  },
}
export const ReasonMissingLight: Story = { ...ReasonMissing, globals: { theme: 'light' } }

/** Save changes with nothing changed: onNothingChanged ("Nothing changed."), nothing is sent. */
export const NothingChanged: Story = {
  play: async ({ canvasElement }) => {
    canvasElement.querySelector('form')?.requestSubmit()
  },
}

export const StaleRevision: Story = {
  args: { serverError: 'This player changed since you opened the form. Reload before editing.' },
}
export const StaleRevisionLight: Story = { ...StaleRevision, globals: { theme: 'light' } }

export const Saving: Story = { args: { isPending: true } }
export const SavingLight: Story = { ...Saving, globals: { theme: 'light' } }

export const LongText: Story = {
  args: {
    player: {
      ...registered,
      name: 'Maria Concepcion Villanueva-Dela Cruz Santos',
      nickname: 'Connie the Net Wall',
      email: 'maria.concepcion.villanueva.delacruz.santos@verylongdomain-example.com',
      playingStyle:
        'Plays mostly doubles at the net with quick hands and flat drives, rotates to the back when her partner covers the front, and prefers long rallies over smashes. Has been coaching juniors on Saturdays for two years.',
      socialLinks: {
        facebook: 'https://facebook.com/maria.concepcion.villanueva.delacruz.santos',
        instagram: 'https://instagram.com/maria_concepcion_villanueva_delacruz',
        youtube: 'https://youtube.com/@mariaconcepcionvillanuevabadminton',
        linkedin: 'https://linkedin.com/in/maria-concepcion-villanueva-dela-cruz-santos',
      },
    },
    createdBy: 'Mandaue Shuttle Smashers Badminton Club',
  },
}
export const LongTextLight: Story = { ...LongText, globals: { theme: 'light' } }
