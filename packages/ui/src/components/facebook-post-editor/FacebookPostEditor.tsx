'use client'

import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { cn } from '@rotra/ui/cn'
import { Field } from '@rotra/ui/field'
import { Tabs, TabsContent } from '@rotra/ui/tabs'
import { Textarea } from '@rotra/ui/textarea'
import { useEffect, useId, useRef, useState } from 'react'

export type PostDraft = {
  template: string
  description: string
  courtRules: string
}

export type PostKey = {
  /** e.g. "club_name" */
  key: string
  /** What it fills, e.g. "Club name" */
  label: string
}

export type FacebookPostEditorProps = {
  draft: PostDraft
  onDraftChange: (draft: PostDraft) => void
  /** The keys a template can use, in the order they are listed */
  keys: readonly PostKey[]
  /** Something differs from what is saved: enables Save post template */
  dirty: boolean
  /** A session exists to fill the preview from */
  canPreview: boolean
  onPreview: () => void
  onSave: (draft: PostDraft) => void
  onReset: () => void
  isPending?: boolean
}

const TABS = [
  { value: 'template', label: 'Template' },
  { value: 'description', label: 'Club description' },
  { value: 'rules', label: 'Court rules' },
]

/**
 * Club settings › Facebook post: the template (with a key list that inserts at the cursor), the
 * club description and the court rules on three tabs, edited together and saved by one button.
 */
export function FacebookPostEditor({
  draft,
  onDraftChange,
  keys,
  dirty,
  canPreview,
  onPreview,
  onSave,
  onReset,
  isPending,
}: FacebookPostEditorProps) {
  const id = useId()
  const [tab, setTab] = useState('template')
  const templateRef = useRef<HTMLTextAreaElement>(null)
  // Where the caret goes once the inserted key has rendered.
  const caret = useRef<number | null>(null)

  useEffect(() => {
    if (caret.current === null) return
    const el = templateRef.current
    if (el) {
      el.focus()
      el.setSelectionRange(caret.current, caret.current)
    }
    caret.current = null
  })

  const insertKey = (key: string) => {
    const el = templateRef.current
    const token = `{{ ${key} }}`
    const start = el?.selectionStart ?? draft.template.length
    const end = el?.selectionEnd ?? start
    const next = draft.template.slice(0, start) + token + draft.template.slice(end)
    caret.current = start + token.length
    onDraftChange({ ...draft, template: next })
  }

  return (
    <Card asChild>
      <section aria-labelledby={`${id}-h`} className="flex flex-col gap-3">
        <div>
          <h2 id={`${id}-h`}>Facebook post</h2>
          <p className="m-0 text-[13px] text-fg2">
            The announcement you copy from a session with “Copy Facebook post”. Write it once with
            {' {{ keys }}'}; each session fills them in.
          </p>
        </div>
        <Tabs items={TABS} value={tab} onChange={setTab} aria-label="Facebook post">
          <TabsContent value="template">
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] font-semibold text-fg2">Template</span>
              <div className="grid grid-cols-[220px_minmax(0,1fr)] items-start gap-3 max-[720px]:grid-cols-[minmax(0,1fr)]">
                <fieldset
                  aria-label="Insert a key"
                  className="m-0 flex max-h-[440px] flex-col gap-1 overflow-y-auto border-0 p-0 pr-1 max-[720px]:max-h-none max-[720px]:flex-row max-[720px]:flex-wrap"
                >
                  {keys.map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => insertKey(key)}
                      aria-label={`Insert {{ ${key} }}: ${label}`}
                      className={cn(
                        'flex min-h-10 flex-col items-start rounded-md border border-border bg-surface px-2.5 py-1.5 text-left text-fg',
                        'hover:border-border-strong hover:bg-elev max-[720px]:min-h-8',
                      )}
                    >
                      <span className="font-mono text-xs">{`{{ ${key} }}`}</span>
                      <span className="text-[13px] leading-[1.3] text-fg2 max-[720px]:hidden">
                        {label}
                      </span>
                    </button>
                  ))}
                </fieldset>
                <Textarea
                  ref={templateRef}
                  aria-label="Post template"
                  rows={18}
                  spellCheck={false}
                  value={draft.template}
                  onChange={(e) => onDraftChange({ ...draft, template: e.target.value })}
                  className="min-h-[440px] font-mono max-[720px]:min-h-[320px]"
                />
              </div>
              <span className="text-xs text-fg2">
                Click a key on the left to insert it where your cursor is in the template. Keys that
                don't exist are left as typed.
              </span>
            </div>
          </TabsContent>
          <TabsContent value="description">
            <Field label="Club description" hint={'Fills {{ club_description }}.'}>
              <Textarea
                rows={4}
                maxLength={300}
                placeholder="One or two lines about your club"
                value={draft.description}
                onChange={(e) => onDraftChange({ ...draft, description: e.target.value })}
              />
            </Field>
          </TabsContent>
          <TabsContent value="rules">
            <Field label="Court rules" hint={'Fills {{ court_rules }}.'}>
              <Textarea
                rows={10}
                maxLength={800}
                value={draft.courtRules}
                onChange={(e) => onDraftChange({ ...draft, courtRules: e.target.value })}
              />
            </Field>
          </TabsContent>
        </Tabs>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={onPreview}
            disabled={!canPreview}
            title={canPreview ? undefined : 'Create a session first to preview the post'}
          >
            Preview
          </Button>
          <span className="flex-1" />
          <Button
            variant="primary"
            disabled={!dirty}
            loading={isPending}
            onClick={() => onSave(draft)}
          >
            Save post template
          </Button>
          <Button variant="ghost" onClick={onReset} disabled={isPending}>
            Reset template to default
          </Button>
        </div>
      </section>
    </Card>
  )
}
