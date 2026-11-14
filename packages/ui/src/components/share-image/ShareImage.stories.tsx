import { players } from '@rotra/data/fixtures/players'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { ShareImage } from './ShareImage'

const player = players[3] ?? players[0]!
const meta = {
  title: 'Shared/ShareImage',
  component: ShareImage,
  args: {
    format: 'post',
    headline: player.fullName,
    subline: player.rtrId,
    spot: { initials: 'MA' },
    children: (
      <div className="flex flex-1 flex-col justify-center gap-2">
        <b data-qr-text className="text-[22px] font-extrabold text-share-accent">
          Intermediate High
        </b>
        <b data-qr-text className="font-mono text-[36px] leading-none text-share-accent">
          #214
        </b>
      </div>
    ),
  },
} satisfies Meta<typeof ShareImage>
export default meta
type Story = StoryObj<typeof meta>

export const FacebookPost: Story = { globals: { theme: 'dark' } }
export const FacebookPostLight: Story = { globals: { theme: 'light' } }
export const Story: Story = { args: { format: 'story' }, globals: { theme: 'dark' } }
export const StoryLight: Story = { args: { format: 'story' }, globals: { theme: 'light' } }
export const Square: Story = { args: { format: 'square' }, globals: { theme: 'dark' } }
export const SquareLight: Story = { args: { format: 'square' }, globals: { theme: 'light' } }
export const GlowBottom: Story = { args: { glow: 'bottom' }, globals: { theme: 'dark' } }
export const GlowBottomLight: Story = { args: { glow: 'bottom' }, globals: { theme: 'light' } }
export const FooterEnd: Story = { args: { footerEnd: '#1–8 of 24' }, globals: { theme: 'dark' } }
export const LongName: Story = {
  args: { headline: 'Maria Cristina Dela Cruz-Santos', subline: 'Lahug Smash Club' },
  globals: { theme: 'dark' },
}
