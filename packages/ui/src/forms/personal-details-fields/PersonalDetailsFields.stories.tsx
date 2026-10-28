import { zodResolver } from '@hookform/resolvers/zod'
import { playerProfiles, profileEditScenarios } from '@rotra/data/fixtures/player-profiles'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { type ReactNode, useEffect } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { PersonalDetailsFields } from './PersonalDetailsFields'
import { personalDetailsFromProfile } from './PersonalDetailsFields.defaultValues'
import {
  type PersonalDetailsValues,
  personalDetailsFieldsSchema,
} from './PersonalDetailsFields.schema'

const jose = playerProfiles.find((p) => p.fullName === 'Jose')
if (!jose) throw new Error('Missing public profile fixture')
function StoryForm({
  values,
  validate = false,
  children,
}: {
  values: PersonalDetailsValues
  validate?: boolean
  children: ReactNode
}) {
  const form = useForm<PersonalDetailsValues>({
    resolver: zodResolver(personalDetailsFieldsSchema),
    defaultValues: values,
    mode: 'onTouched',
  })
  useEffect(() => {
    if (validate) void form.trigger()
  }, [validate, form])
  return (
    <FormProvider {...form}>
      <form noValidate className="max-w-[640px] rounded-lg border border-border bg-surface p-4">
        {children}
      </form>
    </FormProvider>
  )
}
const meta = {
  title: 'Player/PersonalDetailsFields',
  component: PersonalDetailsFields,
  args: { sections: ['name', 'playing-style', 'links'] },
  render: (args) => (
    <StoryForm values={personalDetailsFromProfile(jose)}>
      <PersonalDetailsFields {...args} />
    </StoryForm>
  ),
} satisfies Meta<typeof PersonalDetailsFields>
export default meta
type Story = StoryObj<typeof meta>
export const AllSections: Story = {}
export const NameOnly: Story = { args: { sections: ['name'] } }
export const PlayingStyleOnly: Story = { args: { sections: ['playing-style'] } }
export const LinksOnly: Story = { args: { sections: ['links'] } }
export const EveryFieldWithAnError: Story = {
  render: (args) => (
    <StoryForm values={{ ...profileEditScenarios.invalid }} validate>
      <PersonalDetailsFields {...args} />
    </StoryForm>
  ),
}
export const Disabled: Story = { args: { disabled: true } }
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
