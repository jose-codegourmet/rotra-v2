import { Chip } from '@rotra/ui/chip'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { ClubProfileCard } from './ClubProfileCard'

const meta = {
  title: 'Shared/ClubProfileCard',
  component: ClubProfileCard,
  args: {
    open: true,
    onOpenChange: fn(),
    name: 'Lakeside Smashers',
    subline: 'Cebu City',
    initials: 'LS',
    bannerKey: 'court',
    chips: (
      <>
        <Chip tone="accent">ROTRA club</Chip>
        <Chip tone="accent">Happening now</Chip>
      </>
    ),
    about: [
      { label: 'Members', value: 42 },
      { label: 'Sessions in 2026', value: 38 },
      { label: 'Next up', value: 'Thursday Night Smash · happening now' },
    ],
    action: { label: 'Open club page', href: '/player/clubs/c1', newTab: true },
  },
} satisfies Meta<typeof ClubProfileCard>

export default meta
type Story = StoryObj<typeof meta>

/** All stories support both themes through the Theme toolbar. Queue: the session page's organizer line. */
export const Queue: Story = {}
export const NothingScheduled: Story = {
  args: {
    chips: <Chip tone="accent">ROTRA club</Chip>,
    about: [
      { label: 'Members', value: 42 },
      { label: 'Sessions in 2026', value: 38 },
      { label: 'Next up', value: 'Nothing scheduled' },
    ],
  },
}
/** Player: the profile's Clubs card; Open club page stays in the app. */
export const Player: Story = {
  args: {
    chips: (
      <>
        <Chip>42 members</Chip>
        <Chip tone="accent">Your club</Chip>
      </>
    ),
    about: [
      { label: 'Based in', value: 'Cebu City' },
      { label: 'Members', value: 42 },
      { label: 'Next up', value: 'Thursday Night Smash · Nov 20' },
    ],
    action: { label: 'Open club page', onClick: fn() },
  },
}
/** Admin: Clubs and licenses, the right-hand side panel. */
export const Admin: Story = {
  args: {
    side: true,
    subline: '@lakeside',
    chips: (
      <>
        <Chip tone="accent">Active</Chip>
        <Chip tone="accent">Running now</Chip>
      </>
    ),
    plainAbout: true,
    about: [
      { label: 'Founded in', value: 'Cebu City' },
      { label: 'Address', value: 'Banilad Sports Hub, Cebu City' },
      { label: 'Set up', value: '2026-03-02' },
      { label: 'Plan', value: 'Yearly' },
      { label: 'Until', value: '2027-03-02' },
      { label: 'Price', value: '₱1,500 a month · ₱15,000 a year' },
    ],
    action: { label: 'Open club', onClick: fn() },
  },
}
export const Light: Story = { globals: { theme: 'light' } }
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
