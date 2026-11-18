import { playerProfiles } from '@rotra/data/fixtures/player-profiles'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { IdentityPicker, type IdentityPickerRecord } from './IdentityPicker'

const withPicture = playerProfiles.find((p) => p.fullName === 'Jose')?.picture ?? null
const lahug: IdentityPickerRecord = {
  id: 'rec-lahug',
  clubName: 'Lahug Smash Club',
  clubInitials: 'LS',
  name: 'Paolo Mendoza',
  nickname: 'Pao',
  picture: withPicture,
  levelLabel: 'Intermediate Low',
  maskedPhone: '+63 917 ••• ••42',
  playingSince: '2019',
  playingStyle: 'Doubles, net play',
  links: ['Facebook', 'Instagram'],
  saved: 'Mar 3, 2026',
  games: 14,
  sessions: 6,
}
const mandaue: IdentityPickerRecord = {
  id: 'rec-mandaue',
  clubName: 'Mandaue Shuttle Society',
  clubInitials: 'MS',
  name: 'Paolo M. Mendoza',
  nickname: null,
  picture: null,
  levelLabel: 'Intermediate High',
  maskedPhone: null,
  playingSince: null,
  playingStyle: null,
  links: [],
  saved: 'Jul 19, 2026',
  games: 1,
  sessions: 1,
}
const third: IdentityPickerRecord = {
  ...mandaue,
  id: 'rec-third',
  clubName: 'Cebu Badminton Club',
  clubInitials: 'CB',
  name: 'Paolo Mendoza',
  nickname: 'P-Man',
  levelLabel: 'Beginner High',
}
const meta = {
  title: 'Player/IdentityPicker',
  component: IdentityPicker,
  args: {
    open: true,
    onOpenChange: fn(),
    onCancel: fn(),
    onPick: fn(),
    email: 'paolo.mendoza@example.com',
    rtrId: 'RTR-PH-CEB-031526-0042',
    records: [lahug, mandaue],
  },
  globals: { theme: 'dark' },
} satisfies Meta<typeof IdentityPicker>
export default meta
type Story = StoryObj<typeof meta>

/** One card with a picture and nickname, one with initials and "No nickname". */
export const TwoCards: Story = {}
export const TwoCardsLight: Story = { globals: { theme: 'light' } }
export const ThreeCards: Story = { args: { records: [lahug, mandaue, third] } }
/** The first card shows its hover and focus state (accent border, raised surface). */
export const HoverAndFocus: Story = {
  play: async ({ canvasElement, userEvent }) => {
    const card = (canvasElement.ownerDocument.querySelector('[aria-label$="Use this identity"]') ??
      null) as HTMLElement | null
    if (!card) return
    card.focus()
    await userEvent.hover(card)
  },
}
export const Phone: Story = { globals: { theme: 'dark', viewport: { value: 'phone' } } }
export const PhoneLight: Story = { globals: { theme: 'light', viewport: { value: 'phone' } } }
