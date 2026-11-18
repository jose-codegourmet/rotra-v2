import type { AdminPlayerEdit } from '@rotra/data/admin-player/types'
import { managementPlayer } from '@rotra/data/fixtures/admin-player-management'
import { foundingCities } from '@rotra/data/fixtures/founding-cities'
import { profileCharacters } from '@rotra/data/fixtures/profile-characters'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn, screen, within } from 'storybook/test'
import { AdminEditPlayerForm } from './AdminEditPlayerForm'

const characters = profileCharacters
  .filter((c) => c.shown)
  .map(({ id, image, number }) => ({ id, image, number }))

/** An unclaimed player a club entered: no password to replace. */
const unclaimed: AdminPlayerEdit = {
  ...managementPlayer,
  phone: '+639171234567',
  email: 'alex.reyes@example.com',
  playingStyle: '',
  experienceYears: null,
  experienceMonths: null,
  socialLinks: { facebook: '', instagram: '', youtube: '', linkedin: '' },
  profilePrivate: false,
  previousPicture: null,
  hasAccount: true,
  passwordSetAt: null,
}

/** An older unclaimed record: a phone and no email (D-2026-11-16-04). */
const detailsRequired: AdminPlayerEdit = { ...unclaimed, email: undefined }

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
    places: foundingCities,
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

/** Details required: the Account hint says Admin can add the email here. */
export const DetailsRequired: Story = {
  args: { player: detailsRequired, detailsRequired: true, createdBy: 'Lahug Smash Club' },
}
export const DetailsRequiredLight: Story = { ...DetailsRequired, globals: { theme: 'light' } }

/** An unclaimed player who has an email can't be saved without one. */
export const UnclaimedEmailRequired: Story = {
  args: { player: unclaimed, createdBy: 'Smash Club Cebu' },
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement)
    await userEvent.clear(canvas.getByRole('textbox', { name: 'Email' }))
    canvasElement.querySelector('form')?.requestSubmit()
  },
}

/** Saved by two clubs: each club's own name and the not-on-the-leaderboard line. */
export const SavedByTwoClubs: Story = {
  args: {
    player: {
      ...unclaimed,
      name: 'Nina Ocampo',
      clubs: [
        {
          clubId: 'c1',
          name: 'Talamban Racket Club',
          addedAt: null,
          savedAs: 'Nina Ocampo',
          identity: 'unclaimed',
        },
        {
          clubId: 'c2',
          name: 'IT Park Badminton Club',
          addedAt: null,
          savedAs: 'Nina O.',
          identity: 'unclaimed',
        },
      ],
    },
  },
}
export const SavedByTwoClubsLight: Story = { ...SavedByTwoClubs, globals: { theme: 'light' } }

/** The RTR ID preview before any change: it is the player's RTR ID. */
export const RtrIdPreview: Story = { args: { player: registered } }

/** Choosing Manila: the preview follows and keeps its number at the end. Never typed by hand. */
type Play = NonNullable<Story['play']>
const chooseManila: Play = async ({ canvasElement, userEvent }) => {
  const canvas = within(canvasElement)
  await userEvent.click(canvas.getByRole('combobox', { name: 'Registration place' }))
  await userEvent.click(await screen.findByRole('option', { name: /Manila/ }))
}
export const RtrIdPreviewChanged: Story = { args: { player: registered }, play: chooseManila }
export const RtrIdPreviewChangedLight: Story = {
  ...RtrIdPreviewChanged,
  globals: { theme: 'light' },
}

/** The registration date was cleared. */
export const RegistrationDateMissing: Story = {
  args: { player: registered, fieldErrors: { registrationDate: 'Enter the registration date.' } },
}
export const RegistrationDateMissingLight: Story = {
  ...RegistrationDateMissing,
  globals: { theme: 'light' },
}

/** The data layer found the RTR ID on another player. */
export const RtrIdAlreadyUsed: Story = {
  args: {
    player: registered,
    fieldErrors: {
      registrationDate: 'Another player already has this RTR ID. Choose another place or date.',
    },
  },
}
export const RtrIdAlreadyUsedLight: Story = { ...RtrIdAlreadyUsed, globals: { theme: 'light' } }

/** Save changes with a changed place opens Change RTR ID? (Current → New) before anything is saved. */
const openChangeRtrId: Play = async (context) => {
  const { canvasElement, userEvent } = context
  await chooseManila(context)
  const canvas = within(canvasElement)
  await userEvent.type(canvas.getByRole('textbox', { name: 'Reason for the change' }), 'Wrong city')
  canvasElement.querySelector('form')?.requestSubmit()
}
export const ChangeRtrIdConfirmation: Story = {
  args: { player: registered },
  play: openChangeRtrId,
}
export const ChangeRtrIdConfirmationLight: Story = {
  ...ChangeRtrIdConfirmation,
  globals: { theme: 'light' },
}

/** Back from the confirmation: the panel is as it was, with everything typed kept. */
export const ChangeRtrIdBack: Story = {
  args: { player: registered },
  play: async (context) => {
    await openChangeRtrId(context)
    await context.userEvent.click(await screen.findByRole('button', { name: 'Back' }))
  },
}

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
