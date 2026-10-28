'use client'

import { Button } from '@rotra/ui/button'
import { SegmentedControl } from '@rotra/ui/segmented-control'
import { Sheet } from '@rotra/ui/sheet'
import { Switch } from '@rotra/ui/switch'
import { TextInput } from '@rotra/ui/text-input'
import { type ReactNode, useId, useState } from 'react'

export type DevMenuProps = {
  audience?: 'queue' | 'admin'
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
    rank: string
    leaderboard: string
    rankOptions: { value: string; label: string }[]
    leaderboardOptions: { value: string; label: string }[]
    onRankChange: (value: string) => void
    onLeaderboardChange: (value: string) => void
  }
  playerAccount?: {
    name: string | null
    pending?: boolean
    onSignIn: () => void
    onSignOut: () => void
  }
  /** Optional until the registration and password-reset preview routes are implemented. */
  playerLinkPreviews?: {
    onRegistration?: (state: 'valid' | 'processing' | 'expired') => void
    onPasswordReset?: (state: 'valid' | 'expired') => void
  }
  /** The contact-change module supplies the active request and its Admin actions. */
  contactRequestSlot?: ReactNode
  actions?: { label: string; onClick: () => void; disabled?: boolean }[]
  extraToggles?: {
    key: string
    label: string
    description: string
    checked: boolean
    onChange: (value: boolean) => void
  }[]
  controlLabels?: Partial<Record<keyof DevMenuProps['toggles'], string>>
}
const CONTROLS = [
  ['offline', 'Simulate offline', "See how the app behaves when the venue's internet drops."],
  ['licenseExpired', 'Simulate expired license', 'Shows the license gate on the home screen.'],
  ['nextSaveFails', 'Next save fails', 'The next change cannot be saved on this device.'],
  ['nextSaveConflict', 'Next save conflicts', 'The next change needs review.'],
] as const
const SECTION = 'flex flex-col gap-2 border-t border-border pt-3'
const LABEL = 'text-xs font-semibold tracking-[0.5px] text-fg2 uppercase'

/** Props-only prototype controls; Player Information follows its own prototype's section layout. */
export function DevMenu({
  audience = 'queue',
  open,
  onOpenChange,
  toggles,
  onToggle,
  onReset,
  actions,
  rankingSettings,
  playerScenarios,
  playerAccount,
  playerLinkPreviews,
  contactRequestSlot,
  extraToggles,
  controlLabels,
}: DevMenuProps) {
  const settingsId = useId()
  const [resetArmed, setResetArmed] = useState(false)
  const changeOpen = (next: boolean) => {
    setResetArmed(false)
    onOpenChange(next)
  }
  const settingsFields = rankingSettings ? (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-3.5">
      <label
        htmlFor={`${settingsId}-weight`}
        className="flex min-w-0 flex-col gap-2 text-[13px] font-semibold text-fg2"
      >
        Club assessment weight (%)
        <TextInput
          type="number"
          min={0}
          max={100}
          id={`${settingsId}-weight`}
          step={5}
          value={rankingSettings.assessmentWeightPercent}
          onChange={(event) => {
            const value = event.target.valueAsNumber
            if (Number.isInteger(value) && value >= 0 && value <= 100)
              rankingSettings.onChange({
                assessmentWeightPercent: value,
                matchRequirement: rankingSettings.matchRequirement,
              })
          }}
        />
      </label>
      <label
        htmlFor={`${settingsId}-requirement`}
        className="flex min-w-0 flex-col gap-2 text-[13px] font-semibold text-fg2"
      >
        Leaderboard match requirement
        <TextInput
          type="number"
          min={1}
          max={40}
          id={`${settingsId}-requirement`}
          value={rankingSettings.matchRequirement}
          onChange={(event) => {
            const value = event.target.valueAsNumber
            if (Number.isInteger(value) && value >= 1 && value <= 40)
              rankingSettings.onChange({
                assessmentWeightPercent: rankingSettings.assessmentWeightPercent,
                matchRequirement: value,
              })
          }}
        />
      </label>
    </div>
  ) : null

  return (
    <>
      <Button size="xs" onClick={() => changeOpen(true)}>
        Prototype
      </Button>
      <Sheet
        open={open}
        onOpenChange={changeOpen}
        title={playerScenarios ? 'Prototype' : 'Prototype controls'}
        footer={
          <Button onClick={() => changeOpen(false)}>{playerScenarios ? 'Done' : 'Close'}</Button>
        }
      >
        {playerScenarios ? (
          <>
            <p className="text-[13px] text-fg2">
              Try the states the Player Information app has to handle. None of these controls are
              part of the real app.
            </p>
            <section className="flex flex-col gap-2">
              <h3 className={LABEL}>Account</h3>
              <div className="flex flex-wrap items-center gap-2">
                {playerAccount?.name ? (
                  <>
                    <span className="text-[13px]">
                      Signed in as <b>{playerAccount.name}</b>
                    </span>
                    <Button
                      size="xs"
                      disabled={playerAccount.pending}
                      onClick={playerAccount.onSignOut}
                    >
                      Sign out
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="text-[13px] text-fg2">Not signed in</span>
                    <Button
                      size="xs"
                      disabled={!playerAccount || playerAccount.pending}
                      onClick={playerAccount?.onSignIn}
                    >
                      Sign in as Migs
                    </Button>
                  </>
                )}
              </div>
            </section>
            <section className={SECTION}>
              <h3 className={LABEL}>Migs's rank</h3>
              <SegmentedControl
                aria-label="Migs's rank"
                className="max-w-full [&>button]:px-[13px]"
                value={playerScenarios.rank}
                options={playerScenarios.rankOptions}
                onChange={playerScenarios.onRankChange}
              />
            </section>
            <section className={SECTION}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <b>Offline</b>
                  <p className="text-[13px] text-fg2">
                    Shows saved copies; sign-in and saving fail.
                  </p>
                </div>
                <Switch
                  aria-label="Offline"
                  checked={toggles.offline}
                  onChange={(value) => onToggle('offline', value)}
                />
              </div>
            </section>
            <section className={SECTION}>
              <h3 className={LABEL}>Leaderboard</h3>
              <SegmentedControl
                aria-label="Leaderboard"
                value={playerScenarios.leaderboard}
                options={playerScenarios.leaderboardOptions}
                onChange={playerScenarios.onLeaderboardChange}
              />
            </section>
            {rankingSettings ? (
              <section className={SECTION}>
                <h3 className={LABEL}>Admin settings</h3>
                {settingsFields}
                <p className="text-xs text-fg2">
                  Copy on the leaderboard, profiles and rank page follows these.
                </p>
              </section>
            ) : null}
            <section className={SECTION}>
              <h3 className={LABEL}>Contact-change request (Admin)</h3>
              {contactRequestSlot ?? (
                <p className="text-[13px] text-fg2">
                  No request yet. Send one from Privacy and contact.
                </p>
              )}
            </section>
            <section className={SECTION}>
              <h3 className={LABEL}>Open a registration link (Jomar)</h3>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="xs"
                  disabled={!playerLinkPreviews?.onRegistration}
                  onClick={() => playerLinkPreviews?.onRegistration?.('valid')}
                >
                  Unused
                </Button>
                <Button
                  size="xs"
                  disabled={!playerLinkPreviews?.onRegistration}
                  onClick={() => playerLinkPreviews?.onRegistration?.('processing')}
                >
                  Still processing
                </Button>
                <Button
                  size="xs"
                  disabled={!playerLinkPreviews?.onRegistration}
                  onClick={() => playerLinkPreviews?.onRegistration?.('expired')}
                >
                  Expired
                </Button>
              </div>
              <p className="text-xs text-fg2">
                Once Jomar registers, the unused link shows as already used.
              </p>
              {!playerLinkPreviews?.onRegistration ? (
                <p className="text-xs text-fg2">
                  Registration link previews are not available yet.
                </p>
              ) : null}
            </section>
            <section className={SECTION}>
              <h3 className={LABEL}>Open a password reset link</h3>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="xs"
                  disabled={!playerLinkPreviews?.onPasswordReset}
                  onClick={() => playerLinkPreviews?.onPasswordReset?.('valid')}
                >
                  Valid
                </Button>
                <Button
                  size="xs"
                  disabled={!playerLinkPreviews?.onPasswordReset}
                  onClick={() => playerLinkPreviews?.onPasswordReset?.('expired')}
                >
                  Expired or used
                </Button>
              </div>
              {!playerLinkPreviews?.onPasswordReset ? (
                <p className="text-xs text-fg2">
                  Password reset link previews are not available yet.
                </p>
              ) : null}
            </section>
            <section className={SECTION}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <b>Next profile save fails</b>
                  <p className="text-[13px] text-fg2">Shows the error and keeps the edits.</p>
                </div>
                <Switch
                  aria-label="Next profile save fails"
                  checked={toggles.nextSaveFails}
                  onChange={(value) => onToggle('nextSaveFails', value)}
                />
              </div>
            </section>
            <section className={SECTION}>
              <Button
                variant="danger"
                size="sm"
                className="self-start"
                onClick={() => {
                  if (!resetArmed) {
                    setResetArmed(true)
                    return
                  }
                  setResetArmed(false)
                  onReset()
                }}
              >
                {resetArmed ? 'Tap again to reset everything' : 'Reset demo data'}
              </Button>
            </section>
          </>
        ) : (
          <>
            <p className="text-sm text-fg2">
              {audience === 'admin'
                ? 'Admin prototype controls. These scenarios use fictional accounts and data.'
                : 'Fake data for a fictional club. Your changes stay in this browser.'}
            </p>
            {audience === 'admin' ? <h3 className={LABEL}>Admin</h3> : null}
            {CONTROLS.filter(([key]) => audience !== 'admin' || key === 'offline').map(
              ([key, label, description]) => (
                <div key={key} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h3>{controlLabels?.[key] ?? label}</h3>
                    <p className="text-sm text-fg2">{description}</p>
                  </div>
                  <Switch
                    checked={toggles[key]}
                    onChange={(value) => onToggle(key, value)}
                    aria-label={controlLabels?.[key] ?? label}
                  />
                </div>
              ),
            )}
            {extraToggles?.map((toggle) => (
              <div key={toggle.key} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h3>{toggle.label}</h3>
                  <p className="text-sm text-fg2">{toggle.description}</p>
                </div>
                <Switch
                  aria-label={toggle.label}
                  checked={toggle.checked}
                  onChange={toggle.onChange}
                />
              </div>
            ))}
            {rankingSettings ? (
              <section className={SECTION}>
                <h3>Admin settings</h3>
                {settingsFields}
              </section>
            ) : null}
            {actions?.map((action) => (
              <Button key={action.label} onClick={action.onClick} disabled={action.disabled}>
                {action.label}
              </Button>
            ))}
            <Button variant="danger" onClick={onReset}>
              Reset demo data
            </Button>
          </>
        )}
      </Sheet>
    </>
  )
}
