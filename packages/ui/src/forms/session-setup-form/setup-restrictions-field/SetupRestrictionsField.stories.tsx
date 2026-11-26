import { type LevelRestriction, levelSlotsError } from '@rotra/schema/level-restriction'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useEffect } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { sessionSetupDefaultValues } from '../SessionSetupForm.defaultValues'
import { SetupRestrictionsField } from './SetupRestrictionsField'

/** Two courts × 8 players: 16 slots. */
function Demo({
  levelRestriction,
  refuse = false,
}: {
  levelRestriction: LevelRestriction
  refuse?: boolean
}) {
  const form = useForm({ defaultValues: { ...sessionSetupDefaultValues(), levelRestriction } })
  // A refused save: the schema's own check, shown the way Create session shows it.
  // biome-ignore lint/correctness/useExhaustiveDependencies: run once
  useEffect(() => {
    if (!refuse) return
    const message = levelSlotsError(levelRestriction, 2, 8)
    if (message) form.setError('levelRestriction', { message })
  }, [])
  return (
    <FormProvider {...form}>
      <div className="flex max-w-xl flex-col gap-4">
        <SetupRestrictionsField />
      </div>
    </FormProvider>
  )
}

const meta = {
  title: 'Queue/SetupRestrictionsField',
  component: SetupRestrictionsField,
} satisfies Meta<typeof SetupRestrictionsField>
export default meta
type Story = StoryObj<typeof meta>

const perLevel = (beginner: number, intermediate: number, advanced: number): LevelRestriction => ({
  kind: 'per-level',
  slots: { beginner, intermediate, advanced },
})
const equal = perLevel(6, 5, 5)
const under = perLevel(6, 4, 2)
const over = perLevel(8, 6, 5)

/** The default: any level can take a slot. */
export const AllLevels: Story = { render: () => <Demo levelRestriction={{ kind: 'all' }} /> }
export const BeginnersOnly: Story = {
  render: () => <Demo levelRestriction={{ kind: 'beginners' }} />,
}
export const BeginnersToIntermediate: Story = {
  render: () => <Demo levelRestriction={{ kind: 'beginners-intermediate' }} />,
}
/** 6 + 5 + 5 of 16 slots: matches the session. */
export const SlotsPerLevelEqual: Story = { render: () => <Demo levelRestriction={equal} /> }
/** 12 of 16: 4 left to place. */
export const SlotsPerLevelUnder: Story = { render: () => <Demo levelRestriction={under} /> }
/** 19 of 16: 3 too many. */
export const SlotsPerLevelOver: Story = { render: () => <Demo levelRestriction={over} /> }
/** Save refused: the slots don't add up to the session's slots. */
export const SaveRefused: Story = { render: () => <Demo levelRestriction={under} refuse /> }

export const AllLevelsLight: Story = {
  render: () => <Demo levelRestriction={{ kind: 'all' }} />,
  globals: { theme: 'light' },
}
export const SlotsPerLevelEqualLight: Story = {
  render: () => <Demo levelRestriction={equal} />,
  globals: { theme: 'light' },
}
export const SlotsPerLevelOverLight: Story = {
  render: () => <Demo levelRestriction={over} />,
  globals: { theme: 'light' },
}
export const SaveRefusedLight: Story = {
  render: () => <Demo levelRestriction={under} refuse />,
  globals: { theme: 'light' },
}
export const SlotsPerLevelPhone: Story = {
  render: () => <Demo levelRestriction={equal} />,
  globals: { viewport: { value: 'phone' } },
}
