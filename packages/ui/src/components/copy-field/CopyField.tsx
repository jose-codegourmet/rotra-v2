'use client'

import { Icon } from '@rotra/ui/icon'
import { useId } from 'react'

export type CopyFieldProps = {
  /** Visible label above the field: “Profile link”, “Link”, “Session link” */
  label: string
  /** The read-only value, shown in monospace */
  value: string
  /** Accessible name of the copy icon button; defaults to “Copy <label in lower case>” */
  copyLabel?: string
  /** Copies the value; the caller shows “Link copied” or the clipboard-failure toast */
  onCopy: () => void
  id?: string
}

/**
 * The prototypes' .copy-field: one 44 px read-only field with the value in monospace and a 34 px copy
 * icon button inside it on the right. Replaces input + Copy button pairs.
 */
export function CopyField({ label, value, copyLabel, onCopy, id }: CopyFieldProps) {
  const autoId = useId()
  const fieldId = id ?? autoId
  return (
    <div className="flex w-full flex-col gap-1.5 text-left">
      <label htmlFor={fieldId} className="text-sm font-semibold text-fg2">
        {label}
      </label>
      <div className="relative">
        <input
          id={fieldId}
          readOnly
          value={value}
          onFocus={(event) => event.currentTarget.select()}
          className="box-border min-h-11 w-full truncate rounded-md border border-border-strong bg-bg py-0 pr-12 pl-3.5 font-mono text-[13px] text-fg focus:outline-2 focus:outline-offset-1 focus:outline-accent"
        />
        <button
          type="button"
          onClick={onCopy}
          aria-label={copyLabel ?? `Copy ${label.toLowerCase()}`}
          title="Copy"
          className="absolute top-1/2 right-1.5 grid size-[34px] -translate-y-1/2 cursor-pointer place-items-center rounded-lg border-0 bg-transparent p-0 text-fg2 hover:bg-elev hover:text-fg focus-visible:outline-2 focus-visible:outline-accent"
        >
          <Icon name="copy" size={18} />
        </button>
      </div>
    </div>
  )
}
