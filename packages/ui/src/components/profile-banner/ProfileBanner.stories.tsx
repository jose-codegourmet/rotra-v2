import type { Meta, StoryObj } from '@storybook/react-vite'
import { PROFILE_BANNERS, ProfileBanner } from './ProfileBanner'

// Placeholder for an uploaded 5:2 banner: a flat image, as Admin uploads would be.
const uploaded = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 400"><rect width="1000" height="400" fill="hsl(210 50% 45%)"/><circle cx="800" cy="120" r="180" fill="hsl(210 50% 65%)"/></svg>',
)}`

const meta = {
  title: 'Player/ProfileBanner',
  component: ProfileBanner,
  args: { bannerKey: 'court', className: 'h-24 w-full rounded-lg' },
} satisfies Meta<typeof ProfileBanner>
export default meta
type Story = StoryObj<typeof meta>

const AllSix = () => (
  <div className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-3">
    {PROFILE_BANNERS.map((banner) => (
      <div key={banner.key} className="flex flex-col gap-1">
        <ProfileBanner bannerKey={banner.key} className="aspect-[5/2] w-full rounded-lg" />
        <span className="text-xs text-fg2">{banner.name}</span>
      </div>
    ))}
  </div>
)

export const Court: Story = {}
export const All: Story = { render: AllSix }
export const AllLight: Story = { render: AllSix, globals: { theme: 'light' } }
export const UnknownKeyFallsBackToCourt: Story = { args: { bannerKey: 'gone' } }
export const UploadedImage: Story = { args: { imageUrl: uploaded } }
