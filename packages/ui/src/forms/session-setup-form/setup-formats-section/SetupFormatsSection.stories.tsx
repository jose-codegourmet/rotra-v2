import type { MatchFormat } from '@rotra/data/match/types'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { fn } from 'storybook/test'
import { sessionSetupDefaultValues } from '../SessionSetupForm.defaultValues'
import { SetupFormatsSection } from './SetupFormatsSection'

const all: MatchFormat[] = ['doubles', 'singles', 'fun_1v2', 'fun_3v3', 'fun_4v4', 'fun_5v5']
function Demo({ initial }: { initial: MatchFormat[] }) {
  const form = useForm({ defaultValues: sessionSetupDefaultValues() })
  const [formats, setFormats] = useState(initial)
  return (
    <FormProvider {...form}>
      <div className="flex max-w-xl flex-col gap-4">
        <SetupFormatsSection allowedRequestFormats={formats} onRequestFormatsChange={setFormats} />
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
export const AllLight: Story = { ...All, globals: { theme: 'light' } }
export const SomeLight: Story = { ...Some, globals: { theme: 'light' } }
export const NoneLight: Story = { ...None, globals: { theme: 'light' } }
