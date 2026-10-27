import { DEFAULT_COURT_RULES, DEFAULT_POST_TEMPLATE, POST_KEYS } from '@rotra/data/club/rules'
import { clubs } from '@rotra/data/fixtures/clubs'
import { CUSTOM_POST_TEMPLATE } from '@rotra/data/fixtures/facebookPost'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { fn } from 'storybook/test'
import { FacebookPostEditor, type PostDraft, type PostKey } from './FacebookPostEditor'

const club = clubs[0]
if (!club) throw new Error('Club fixture missing')

const keys: PostKey[] = POST_KEYS.map(([key, label]) => ({ key, label }))

const saved: PostDraft = {
  template: DEFAULT_POST_TEMPLATE,
  description: club.description,
  courtRules: DEFAULT_COURT_RULES,
}

function Demo({
  initial = saved,
  canPreview = true,
}: {
  initial?: PostDraft
  canPreview?: boolean
}) {
  const [draft, setDraft] = useState(initial)
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved)
  return (
    <FacebookPostEditor
      draft={draft}
      onDraftChange={setDraft}
      keys={keys}
      dirty={dirty}
      canPreview={canPreview}
      onPreview={fn()}
      onSave={fn()}
      onReset={() => setDraft(saved)}
    />
  )
}

const meta = {
  title: 'Queue/FacebookPostEditor',
  component: FacebookPostEditor,
  args: {
    draft: saved,
    onDraftChange: fn(),
    keys,
    dirty: false,
    canPreview: true,
    onPreview: fn(),
    onSave: fn(),
    onReset: fn(),
  },
} satisfies Meta<typeof FacebookPostEditor>

export default meta
type Story = StoryObj<typeof meta>

export const Template: Story = { render: () => <Demo /> }
export const CustomTemplateUnsaved: Story = {
  render: () => <Demo initial={{ ...saved, template: CUSTOM_POST_TEMPLATE }} />,
}
export const NoSessionToPreview: Story = { render: () => <Demo canPreview={false} /> }
export const Pending: Story = { args: { dirty: true, isPending: true } }
export const Phone: Story = {
  render: () => <Demo />,
  globals: { viewport: { value: 'phone' } },
}
