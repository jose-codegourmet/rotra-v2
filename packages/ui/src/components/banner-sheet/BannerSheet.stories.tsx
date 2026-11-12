import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { fn } from 'storybook/test'
import { BannerSheet, type BannerSheetProps } from './BannerSheet'

const uploaded = (hue: number) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 400"><rect width="1000" height="400" fill="hsl(${hue} 50% 45%)"/><circle cx="800" cy="120" r="180" fill="hsl(${hue} 50% 65%)"/></svg>`,
  )}`

function Demo(args: BannerSheetProps) {
  const [open, setOpen] = useState(true)
  const [value, setValue] = useState(args.value)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open profile banner
      </button>
      <BannerSheet
        {...args}
        open={open}
        onOpenChange={setOpen}
        value={value}
        onCommit={async (key) => {
          await args.onCommit(key)
          setValue(key)
        }}
      />
    </>
  )
}

const meta = {
  title: 'Player/BannerSheet',
  component: BannerSheet,
  args: { open: true, onOpenChange: fn(), value: 'court', onCommit: fn(async () => {}) },
  render: (args) => <Demo {...args} />,
} satisfies Meta<typeof BannerSheet>
export default meta
type Story = StoryObj<typeof meta>

export const CourtSaved: Story = {}
export const CourtSavedLight: Story = { globals: { theme: 'light' } }
export const NoBannerYet: Story = { args: { value: null } }
/** Admin uploads beside the seeded banners */
export const UploadedBanners: Story = {
  args: {
    options: [
      { key: 'court', name: 'Court' },
      { key: 'night', name: 'Night' },
      { key: 'b-7', name: 'Banner 7', imageUrl: uploaded(210) },
      { key: 'b-8', name: 'Banner 8', imageUrl: uploaded(30) },
      { key: 'b-9', name: 'Banner 9', imageUrl: uploaded(130) },
    ],
    value: 'b-8',
  },
}
export const Saving: Story = { args: { isPending: true } }
export const SavingLight: Story = { args: { isPending: true }, globals: { theme: 'light' } }
/** Banners still loading, or offline */
export const Disabled: Story = { args: { disabled: true } }
export const SaveFails: Story = {
  args: {
    onCommit: fn(async () => {
      throw new Error("Couldn't save your banner. Try again.")
    }),
  },
}
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const PhoneLight: Story = { globals: { viewport: { value: 'phone' }, theme: 'light' } }
