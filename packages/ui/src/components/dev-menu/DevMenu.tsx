'use client'

import { Button } from '@rotra/ui/button'
import { Sheet } from '@rotra/ui/sheet'
import { Switch } from '@rotra/ui/switch'

export type DevMenuProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  toggles: {
    offline: boolean
    licenseExpired: boolean
    nextSaveFails: boolean
    nextSaveConflict: boolean
  }
  onToggle: (key: keyof DevMenuProps['toggles'], value: boolean) => void
  onReset: () => void
  actions?: { label: string; onClick: () => void; disabled?: boolean }[]
}
const CONTROLS = [
  ['offline', 'Simulate offline', "See how the app behaves when the venue's internet drops."],
  ['licenseExpired', 'Simulate expired license', 'Shows the license gate on the home screen.'],
  ['nextSaveFails', 'Next save fails', 'The next change cannot be saved on this device.'],
  ['nextSaveConflict', 'Next save conflicts', 'The next change needs review.'],
] as const

/** Props-only prototype controls; the app decides whether development tools are enabled. */
export function DevMenu({ open, onOpenChange, toggles, onToggle, onReset, actions }: DevMenuProps) {
  return (
    <>
      <Button size="xs" onClick={() => onOpenChange(true)}>
        Prototype
      </Button>
      <Sheet
        open={open}
        onOpenChange={onOpenChange}
        title="Prototype controls"
        footer={<Button onClick={() => onOpenChange(false)}>Close</Button>}
      >
        <p className="text-sm text-fg2">
          Fake data for a fictional club. Your changes stay in this browser.
        </p>
        {CONTROLS.map(([key, label, description]) => (
          <div key={key} className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h3>{label}</h3>
              <p className="text-sm text-fg2">{description}</p>
            </div>
            <Switch
              checked={toggles[key]}
              onChange={(value) => onToggle(key, value)}
              aria-label={label}
            />
          </div>
        ))}
        {actions?.map((action) => (
          <Button key={action.label} onClick={action.onClick} disabled={action.disabled}>
            {action.label}
          </Button>
        ))}
        <Button variant="danger" onClick={onReset}>
          Reset demo data
        </Button>
      </Sheet>
    </>
  )
}
