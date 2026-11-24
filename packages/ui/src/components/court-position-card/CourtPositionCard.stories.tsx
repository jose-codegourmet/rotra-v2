import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { type CourtPosition, CourtPositionCard } from './CourtPositionCard'

const ART: Record<CourtPosition, string> = {
  front: '/art/onboarding/court-front.webp',
  back: '/art/onboarding/court-back.webp',
  all: '/art/onboarding/court-all.webp',
}

const meta = {
  title: 'Player/CourtPositionCard',
  component: CourtPositionCard,
  args: { value: '', onChange: () => {}, art: ART },
  render: (args) => {
    const [value, setValue] = useState(args.value)
    return <CourtPositionCard {...args} value={value} onChange={setValue} />
  },
} satisfies Meta<typeof CourtPositionCard>

export default meta
type Story = StoryObj<typeof meta>

export const NonePicked: Story = {}
export const FrontPicked: Story = { args: { value: 'front' } }
export const BackPicked: Story = { args: { value: 'back' } }
export const AllRoundPicked: Story = { args: { value: 'all' } }
export const NonePickedLight: Story = { globals: { theme: 'light' } }
export const BackPickedLight: Story = { args: { value: 'back' }, globals: { theme: 'light' } }
export const Phone: Story = { args: { value: 'front' }, globals: { viewport: { value: 'phone' } } }
