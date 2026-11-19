import type { MatchFormat } from '@rotra/data/match/types'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { fn } from 'storybook/test'
import { sessionSetupDefaultValues } from '../SessionSetupForm.defaultValues'
import { SetupFormatsSection } from './SetupFormatsSection'

const all: MatchFormat[] = ['doubles', 'singles', 'fun_1v2', 'fun_3v3', 'fun_4v4', 'fun_5v5']
function Demo({
  initial,
  recordGames = true,
  locked = false,
}: {
  initial: MatchFormat[]
  recordGames?: boolean
  locked?: boolean
}) {
  const form = useForm({ defaultValues: { ...sessionSetupDefaultValues(), recordGames } })
  const [formats, setFormats] = useState(initial)
  return (
    <FormProvider {...form}>
      <div className="flex max-w-xl flex-col gap-4">
        <SetupFormatsSection
          recordGamesLocked={locked}
          allowedRequestFormats={formats}
          onRequestFormatsChange={setFormats}
        />
      </div>
    </FormProvider>
  )
}
const meta = {
  title: 'Queue/SetupFormatsSection',
  component: SetupFormatsSection,
  args: { allowedRequestFormats: [], onRequestFormatsChange: fn() },
} satisfies Meta<typeof SetupFormatsSection>
export default meta
type Story = StoryObj<typeof meta>
export const All: Story = { render: () => <Demo initial={all} /> }
export const Some: Story = { render: () => <Demo initial={['doubles', 'singles']} /> }
export const None: Story = { render: () => <Demo initial={[]} /> }
/** Record games switch off: the hint says no results are kept */
export const RecordGamesOff: Story = { render: () => <Demo initial={all} recordGames={false} /> }
/** After Start: a read-only On chip and "Record games can't change after Start." */
export const RecordGamesLockedOn: Story = { render: () => <Demo initial={all} locked /> }
export const RecordGamesLockedOff: Story = {
  render: () => <Demo initial={all} recordGames={false} locked />,
}
export const RecordGamesOffLight: Story = { ...RecordGamesOff, globals: { theme: 'light' } }
export const RecordGamesLockedOnLight: Story = {
  ...RecordGamesLockedOn,
  globals: { theme: 'light' },
}
export const AllLight: Story = { ...All, globals: { theme: 'light' } }
export const SomeLight: Story = { ...Some, globals: { theme: 'light' } }
export const NoneLight: Story = { ...None, globals: { theme: 'light' } }
