import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { type Choice, ChoiceGroup } from './ChoiceGroup'

// Copy from the Queue prototype's MODES (session setup › mode)
const MODES: Choice[] = [
  { value: 'chill', title: 'Chill', description: 'Aims for roughly 30% easy games per player.' },
  {
    value: 'fair',
    title: 'Fair',
    description: 'Mainly level-matched games, roughly 10% easy games.',
  },
  { value: 'hard', title: 'Hard', description: 'Demanding runs, including 2–3 consecutive games.' },
]

const meta = {
  title: 'Shared/ChoiceGroup',
  component: ChoiceGroup,
  args: {
    type: 'single',
    'aria-label': 'Session mode',
    choices: MODES,
    value: 'fair',
    onChange: () => {},
  },
} satisfies Meta<typeof ChoiceGroup>

export default meta
type Story = StoryObj<typeof meta>

export const Single: Story = {
  render: () => {
    const [value, setValue] = useState('fair')
    return (
      <ChoiceGroup
        type="single"
        aria-label="Session mode"
        choices={MODES}
        value={value}
        onChange={setValue}
      />
    )
  },
}

export const Multiple: Story = {
  render: () => {
    const [value, setValue] = useState(['doubles'])
    return (
      <ChoiceGroup
        type="multiple"
        aria-label="Formats"
        choices={[
          { value: 'doubles', title: 'Doubles' },
          { value: 'singles', title: 'Singles' },
        ]}
        value={value}
        onChange={setValue}
      />
    )
  },
}

export const WithEyebrow: Story = {
  render: () => {
    const [value, setValue] = useState('')
    return (
      <ChoiceGroup
        type="single"
        aria-label="Winner"
        choices={[
          { value: 'A', eyebrow: 'Team A', title: 'Jose and Aaron' },
          { value: 'B', eyebrow: 'Team B', title: 'Raymark and Mikee Abellana' },
        ]}
        value={value}
        onChange={setValue}
      />
    )
  },
}

export const Disabled: Story = { args: { disabled: true } }

export const Phone: Story = { render: Single.render, globals: { viewport: { value: 'phone' } } }
