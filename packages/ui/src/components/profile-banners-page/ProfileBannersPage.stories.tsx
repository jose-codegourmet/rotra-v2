import { PROFILE_BANNERS } from '@rotra/ui/profile-banner'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { fn } from 'storybook/test'
import { ProfileBannersPage, type ProfileBannerTile } from './ProfileBannersPage'

// The six seeded banners (drawn from tokens) plus one upload.
const uploaded = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 200"><rect width="600" height="200" fill="hsl(210 50% 45%)"/><circle cx="480" cy="60" r="90" fill="hsl(210 50% 65%)"/></svg>',
)}`
const seeded: ProfileBannerTile[] = PROFILE_BANNERS.map((banner, i) => ({
  id: `bn${i + 1}`,
  name: banner.name,
  bannerKey: banner.key,
  shown: true,
}))
const withUpload: ProfileBannerTile[] = [
  ...seeded,
  { id: 'bn7', name: 'Banner 7', imageUrl: uploaded, shown: true },
]
const someHidden = withUpload.map((banner, i) => ({ ...banner, shown: i % 3 !== 1 }))

const meta = {
  title: 'Admin/ProfileBannersPage',
  component: ProfileBannersPage,
  args: { banners: seeded, onFiles: fn(), onToggle: fn(), onDelete: fn() },
  decorators: [(Story) => <div className="flex max-w-[960px] flex-col gap-4">{Story()}</div>],
} satisfies Meta<typeof ProfileBannersPage>
export default meta
type Story = StoryObj<typeof meta>

export const AllShown: Story = {}
export const AllShownLight: Story = { globals: { theme: 'light' } }
export const SomeHidden: Story = { args: { banners: someHidden } }
export const SomeHiddenLight: Story = { args: { banners: someHidden }, globals: { theme: 'light' } }
export const Uploading: Story = { args: { banners: withUpload, upload: { done: 1, total: 3 } } }
export const UploadingLight: Story = { ...Uploading, globals: { theme: 'light' } }
export const Offline: Story = { args: { banners: someHidden, disabled: true } }
export const OfflineLight: Story = { ...Offline, globals: { theme: 'light' } }
export const Phone: Story = {
  args: { banners: someHidden },
  globals: { viewport: { value: 'phone' } },
}
/** Click to hide or show, × to delete (no minimum or toasts here: those are the container's) */
export const Interactive: Story = {
  render: (args) => {
    const [banners, setBanners] = useState(withUpload)
    return (
      <ProfileBannersPage
        {...args}
        banners={banners}
        onToggle={(id) =>
          setBanners((list) => list.map((b) => (b.id === id ? { ...b, shown: !b.shown } : b)))
        }
        onDelete={(id) => setBanners((list) => list.filter((b) => b.id !== id))}
      />
    )
  },
}
