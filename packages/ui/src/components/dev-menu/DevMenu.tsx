'use client'

import { Button } from '@rotra/ui/button'
import { Select } from '@rotra/ui/select'
import { Sheet } from '@rotra/ui/sheet'
import { Switch } from '@rotra/ui/switch'
import { TextInput } from '@rotra/ui/text-input'
import { useId } from 'react'

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
  rankingSettings?: {
    assessmentWeightPercent: number
    matchRequirement: number
    onChange: (settings: { assessmentWeightPercent: number; matchRequirement: number }) => void
  }
  playerScenarios?: {
    rank: string; leaderboard: string
    rankOptions: { value: string; label: string }[]
    leaderboardOptions: { value: string; label: string }[]
    onRankChange: (value: string) => void
    onLeaderboardChange: (value: string) => void
  }
  actions?: { label: string; onClick: () => void; disabled?: boolean }[]
}
const CONTROLS = [
  ['offline', 'Simulate offline', "See how the app behaves when the venue's internet drops."],
  ['licenseExpired', 'Simulate expired license', 'Shows the license gate on the home screen.'],
  ['nextSaveFails', 'Next save fails', 'The next change cannot be saved on this device.'],
  ['nextSaveConflict', 'Next save conflicts', 'The next change needs review.'],
] as const

/** Props-only prototype controls; the app decides whether development tools are enabled. */
export function DevMenu({
  open,
  onOpenChange,
  toggles,
  onToggle,
  onReset,
  actions,
  rankingSettings,
  playerScenarios,
}: DevMenuProps) {
  const settingsId = useId()
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
        {playerScenarios && (
          <section className="flex flex-col gap-3 border-t border-border pt-3">
            <h3>Migs's rank</h3>
            <Select aria-label="Migs's rank" value={playerScenarios.rank} options={playerScenarios.rankOptions} onChange={playerScenarios.onRankChange} />
            <h3>Leaderboard</h3>
            <Select aria-label="Leaderboard" value={playerScenarios.leaderboard} options={playerScenarios.leaderboardOptions} onChange={playerScenarios.onLeaderboardChange} />
          </section>
        )}
        {rankingSettings && (
          <section className="flex flex-col gap-3 border-t border-border pt-3">
            <h3>Admin settings</h3>
            <label htmlFor={`${settingsId}-weight`} className="flex flex-col gap-1">
              Club assessment weight (%)
              <TextInput
                type="number"
                min={0}
                max={100}
                id={`${settingsId}-weight`}
                step={5}
                value={rankingSettings.assessmentWeightPercent}
                onChange={(e) => {
                  const v = e.target.valueAsNumber
                  if (Number.isInteger(v) && v >= 0 && v <= 100)
                    rankingSettings.onChange({
                      assessmentWeightPercent: v,
                      matchRequirement: rankingSettings.matchRequirement,
                    })
                }}
              />
            </label>
            <label htmlFor={`${settingsId}-requirement`} className="flex flex-col gap-1">
              Leaderboard match requirement
              <TextInput
                type="number"
                min={1}
                id={`${settingsId}-requirement`}
                max={40}
                value={rankingSettings.matchRequirement}
                onChange={(e) => {
                  const v = e.target.valueAsNumber
                  if (Number.isInteger(v) && v >= 1 && v <= 40)
                    rankingSettings.onChange({
                      assessmentWeightPercent: rankingSettings.assessmentWeightPercent,
                      matchRequirement: v,
                    })
                }}
              />
            </label>
          </section>
        )}
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
