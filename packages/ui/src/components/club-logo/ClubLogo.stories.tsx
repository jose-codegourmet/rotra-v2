import { adminClubRows } from '@rotra/data/fixtures/admin-clubs'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { ClubLogo } from './ClubLogo'

const club = adminClubRows[1]
if (!club) throw new Error('Club fixture missing')

const meta = {
  title: 'Admin/ClubLogo',
  component: ClubLogo,
  args: { initials: club.initials, logoUrl: null, size: 'sm', tone: 'default' },
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'lg'] },
    tone: { control: 'inline-radio', options: ['default', 'accent'] },
  },
} satisfies Meta<typeof ClubLogo>

export default meta
type Story = StoryObj<typeof meta>

// Same placeholder picture as ClubIdentityPanel's WithLogo story; any picture URL works.
const sampleLogo =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64"/></svg>'

export const Small: Story = {}
export const Large: Story = { args: { size: 'lg' } }
export const Accent: Story = {
  args: { initials: adminClubRows[0]?.initials ?? 'LS', tone: 'accent' },
}
export const WithImage: Story = { args: { size: 'lg', logoUrl: sampleLogo } }
export const Light: Story = {
  render: (args) => (
    <div className="flex items-center gap-3">
      <ClubLogo {...args} />
      <ClubLogo {...args} tone="accent" />
      <ClubLogo {...args} size="lg" />
      <ClubLogo {...args} size="lg" tone="accent" />
    </div>
  ),
  globals: { theme: 'light' },
}
