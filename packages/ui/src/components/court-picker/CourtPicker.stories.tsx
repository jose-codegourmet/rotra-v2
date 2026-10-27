import { startMatchFixtures } from '@rotra/data/fixtures/start-match'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { fn } from 'storybook/test'
import { CourtPicker, type CourtPickerProps } from './CourtPicker'

function Demo(args: CourtPickerProps) {
  const [value, setValue] = useState(args.value)
  return (
    <CourtPicker
      {...args}
      value={value}
      onChange={(next) => {
        args.onChange(next)
        setValue(next)
      }}
    />
  )
}

const meta = {
  title: 'Queue/CourtPicker',
  component: CourtPicker,
  decorators: [
    (Story) => (
      <div className="w-[520px] max-w-full">
        <Story />
      </div>
    ),
  ],
  args: {
    courts: startMatchFixtures.doublesReady.freeCourts,
    value: startMatchFixtures.doublesReady.selectedCourtIds,
    required: 1,
    onChange: fn(),
  },
  render: (args) => <Demo {...args} />,
} satisfies Meta<typeof CourtPicker>

export default meta
type Story = StoryObj<typeof meta>

/** One court: the opening court is preselected and a pick replaces it. */
export const OneCourt: Story = {}

/** 5v5: two free courts are preselected; a third pick replaces the oldest. */
export const TwoCourts: Story = {
  args: {
    courts: startMatchFixtures.fiveVFive.freeCourts,
    value: startMatchFixtures.fiveVFive.selectedCourtIds,
    required: 2,
  },
}

/** Opened from a queue card with nothing preselected. */
export const NothingChosen: Story = { args: { value: [] } }

export const Disabled: Story = { args: { disabled: true } }

export const Phone: Story = {
  args: TwoCourts.args,
  globals: { viewport: { value: 'phone' } },
}
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
