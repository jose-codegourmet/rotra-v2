import { zodResolver } from '@hookform/resolvers/zod'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { FormProvider, useForm } from 'react-hook-form'
import { GettingToKnowFields, type GettingToKnowFieldsProps } from './GettingToKnowFields'
import { gettingToKnowDefaultValues } from './GettingToKnowFields.defaultValues'
import { gettingToKnowFieldsSchema } from './GettingToKnowFields.schema'

function Harness(props: GettingToKnowFieldsProps) {
  const form = useForm({
    resolver: zodResolver(gettingToKnowFieldsSchema),
    defaultValues: { ...gettingToKnowDefaultValues, shots: ['smash'], playStyle: 'back' as const },
  })
  return (
    <FormProvider {...form}>
      <GettingToKnowFields {...props} />
    </FormProvider>
  )
}

const meta = {
  title: 'Player/GettingToKnowFields',
  component: GettingToKnowFields,
  render: (args) => <Harness {...args} />,
  args: { sections: ['court', 'shots', 'favorite'], labelled: true },
} satisfies Meta<typeof GettingToKnowFields>

export default meta
type Story = StoryObj<typeof meta>

export const EditProfile: Story = {}
export const EditProfileLight: Story = { globals: { theme: 'light' } }
export const EditProfilePhone: Story = { globals: { viewport: { value: 'phone' } } }
export const CourtOnly: Story = { args: { sections: ['court'], labelled: false } }
