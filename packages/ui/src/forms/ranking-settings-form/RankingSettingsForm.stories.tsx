import { rankingPolicyVersion1 } from '@rotra/data/fixtures/ranking-settings'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { fn } from 'storybook/test'
import { RankingSettingsForm, type RankingSettingsFormProps } from './RankingSettingsForm'
import { rankingSettingsDraftFrom } from './RankingSettingsForm.defaultValues'
import type { RankingSettingsFormInput } from './RankingSettingsForm.schema'

/** Version 1 in effect: 70% / 30%, 10 matches. */
const baseline = {
  assessmentPercent: rankingPolicyVersion1.assessmentWeightBp / 100,
  performancePercent: rankingPolicyVersion1.performanceWeightBp / 100,
  recentStandardMatchThreshold: rankingPolicyVersion1.recentStandardMatchThreshold,
}
const effective = rankingSettingsDraftFrom(baseline)
const draft = (values: Partial<RankingSettingsFormInput>) => ({ ...effective, ...values })

/** Keeps the draft in story state, as the container does, so typing works. */
function Controlled({ values, onChange, ...props }: RankingSettingsFormProps) {
  const [draftValues, setDraft] = useState(values)
  return (
    <RankingSettingsForm
      {...props}
      values={draftValues}
      onChange={(next) => {
        setDraft(next)
        onChange(next)
      }}
      onDiscard={() => {
        setDraft(effective)
        props.onDiscard()
      }}
    />
  )
}

const meta = {
  title: 'Admin/RankingSettingsForm',
  component: RankingSettingsForm,
  args: {
    values: effective,
    baseline,
    onChange: fn(),
    onSubmit: fn(),
    onDiscard: fn(),
  },
  render: (args) => <Controlled key={JSON.stringify(args.values)} {...args} />,
} satisfies Meta<typeof RankingSettingsForm>

export default meta
type Story = StoryObj<typeof meta>

export const Effective: Story = {}
/** 60% / 40% and 12 matches, not yet reviewed. */
export const Dirty: Story = {
  args: { values: draft({ assessment: '60', performance: '40', threshold: '12' }) },
}
/** 70 / 40 adds up to 110%: rejected on the total and Review changes stays off. */
export const InvalidTotal: Story = { args: { values: draft({ performance: '40' }) } }
export const InvalidThreshold: Story = { args: { values: draft({ threshold: '0' }) } }
/** Someone else saved a version while editing: the draft is kept, Review changes stays off. */
export const Locked: Story = { args: { ...Dirty.args, locked: true } }
export const ServerError: Story = {
  args: {
    ...Dirty.args,
    serverError: "You're offline, so nothing was saved. Try again once you're connected.",
  },
}
export const Phone: Story = { ...Dirty, globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = { ...Dirty, globals: { viewport: { value: 'desktop' } } }
export const EffectiveLight: Story = { globals: { theme: 'light' } }
export const DirtyLight: Story = { ...Dirty, globals: { theme: 'light' } }
export const InvalidTotalLight: Story = { ...InvalidTotal, globals: { theme: 'light' } }
