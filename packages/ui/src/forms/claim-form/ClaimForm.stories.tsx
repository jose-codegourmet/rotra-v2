import { claimLinkScenarios } from '@rotra/data/fixtures/player-accounts'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn, within } from 'storybook/test'
import { ClaimForm } from './ClaimForm'

const meta = {
  parameters: { layout: 'fullscreen' },
  title: 'Player/ClaimForm',
  component: ClaimForm,
  args: {
    clubName: claimLinkScenarios.clubName,
    maskedPhone: claimLinkScenarios.preview.maskedPhone,
    defaultValues: claimLinkScenarios.preset,
    onSubmit: fn(),
  },
} satisfies Meta<typeof ClaimForm>
export default meta
type Story = StoryObj<typeof meta>
export const Preset: Story = {}
export const AllErrors: Story = {
  args: { defaultValues: { ...claimLinkScenarios.preset, fullName: '' } },
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement)
    await userEvent.type(await canvas.findByLabelText(/^Password/), 'one')
    await userEvent.type(canvas.getByLabelText(/Confirm password/), 'two')
    await userEvent.click(canvas.getByRole('button', { name: 'Continue' }))
  },
}
export const EmailConflict: Story = {
  args: {
    defaultValues: { ...claimLinkScenarios.preset, email: claimLinkScenarios.takenEmail },
    serverError: { message: claimLinkScenarios.emailConflict, field: 'email' },
  },
}
/** The profile has no phone on file, so the player types one. */
export const NoPhoneOnFile: Story = { args: { maskedPhone: '' } }
export const Pending: Story = { args: { isPending: true } }
export const OfflineServerError: Story = {
  args: { serverError: { message: claimLinkScenarios.offline } },
}
export const NoGenderChosen: Story = {
  args: { standalone: true, maskedPhone: '', defaultValues: {} },
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: 'Continue' }))
  },
}
export const OptionalFieldError: Story = {
  args: {
    defaultValues: {
      ...claimLinkScenarios.preset,
      nickname: 'A nickname that is far too long to keep',
    },
  },
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: 'Continue' }))
  },
}
export const Light: Story = { globals: { theme: 'light' } }
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }

/** Guest registration shares the same form, with no profile prefill or guest linkage. */
export const GuestRegistration: Story = {
  args: { standalone: true, maskedPhone: '', defaultValues: {} },
}
export const GuestAccountMatch: Story = {
  args: { standalone: true, maskedPhone: '', accountMatch: true, onDismissMatch: fn() },
}

/** Google mode: the Google row replaces Email and the password fields; the full name starts from Google. */
export const GoogleRegistration: Story = {
  args: {
    standalone: true,
    maskedPhone: '',
    defaultValues: { fullName: 'Ana Reyes' },
    google: { name: 'Ana Reyes', email: 'ana.reyes@gmail.com', onChange: fn() },
  },
}
export const GoogleRegistrationAdminLink: Story = {
  args: {
    ...GoogleRegistration.args,
    cities: [
      { value: 'CEB', label: 'Cebu City' },
      { value: 'MNL', label: 'Manila' },
    ],
  },
}
export const GoogleRegistrationLight: Story = {
  ...GoogleRegistration,
  globals: { theme: 'light' },
}
export const GoogleClaim: Story = {
  args: {
    google: { name: 'Raymark', email: 'raymark.plays@gmail.com', onChange: fn() },
  },
}
/** Finish registering after a pick in IdentityPicker (two clubs saved the email). */
export const GoogleAfterIdentityPick: Story = {
  args: {
    standalone: true,
    maskedPhone: '',
    defaultValues: { fullName: 'Paolo Mendoza', nickname: 'Pao' },
    google: { name: 'Paolo Mendoza', email: 'paolo.mendoza@example.com', onChange: fn() },
    pickedIdentity: { clubName: 'Lahug Smash Club', rtrId: 'RTR-PH-CEB-031526-0042' },
  },
}
export const GoogleAfterIdentityPickLight: Story = {
  ...GoogleAfterIdentityPick,
  globals: { theme: 'light' },
}
/** Finish registering when exactly one club saved the email: its details are filled in. */
export const GoogleOneClubEmailMatch: Story = {
  args: {
    standalone: true,
    maskedPhone: '',
    defaultValues: { fullName: 'Jomar dela Cruz', nickname: 'Jom' },
    google: { name: 'Jomar dela Cruz', email: 'jomar.delacruz@example.com', onChange: fn() },
    emailMatch: { clubName: 'Lahug Smash Club', rtrId: 'RTR-PH-CEB-031526-0057' },
  },
}
export const GoogleOneClubEmailMatchLight: Story = {
  ...GoogleOneClubEmailMatch,
  globals: { theme: 'light' },
}
