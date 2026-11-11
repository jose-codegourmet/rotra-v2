'use client'

import { Card } from '@rotra/ui/card'
import { Notice } from '@rotra/ui/notice'
import { Switch } from '@rotra/ui/switch'
import { useId } from 'react'

export type PlayerInformationCardProps = {
  /** The confirmed, saved value (players.hidden_from_directory); the switch never shows an unconfirmed one */
  savedHidden: boolean
  isPending?: boolean
  /** e.g. the offline error */
  error?: string
  /** The container saves it and shows the toast */
  onToggle: (nextHidden: boolean) => void
}

/**
 * P-PROFILE-PRIVACY › Player Information: the switch “Hide me from Player Information” with its
 * helper, then the saved-state line. Built like PhonePrivacyCard.
 */
export function PlayerInformationCard({
  savedHidden,
  isPending,
  error,
  onToggle,
}: PlayerInformationCardProps) {
  const switchId = useId()
  return (
    <Card asChild>
      <section className="flex flex-col gap-3">
        <h2>Player Information</h2>
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <label htmlFor={switchId} className="font-bold">
              Hide me from Player Information
            </label>
            <p className="m-0 text-fg2 text-sm">
              Clubs can't find you in the Player Information search or by RTR ID. Clubs that already
              saved you can still add you. You join sessions yourself.
            </p>
          </div>
          <Switch
            id={switchId}
            aria-label="Hide me from Player Information"
            checked={savedHidden}
            disabled={isPending}
            aria-busy={isPending || undefined}
            onChange={(next) => onToggle(next)}
          />
        </div>
        <p className="m-0 text-sm" aria-live="polite">
          {isPending
            ? 'Saving…'
            : savedHidden
              ? 'Saved: you are hidden from Player Information.'
              : 'Saved: clubs can find you in Player Information.'}
        </p>
        {error ? <Notice tone="error">{error}</Notice> : null}
      </section>
    </Card>
  )
}
