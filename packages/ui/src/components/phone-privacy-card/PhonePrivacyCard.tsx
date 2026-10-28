'use client'

import { Card } from '@rotra/ui/card'
import { Notice } from '@rotra/ui/notice'
import { Switch } from '@rotra/ui/switch'
import { useId } from 'react'

export type PhonePrivacyCardProps = {
  /** The confirmed, saved value; the switch never shows an unconfirmed one */
  savedHidden: boolean
  isPending?: boolean
  error?: string
  onToggle: (nextHidden: boolean) => void
}

/** P-PHONE-PRIVACY: 'Hide my phone number from clubs' with a separate saved-state line. */
export function PhonePrivacyCard({
  savedHidden,
  isPending,
  error,
  onToggle,
}: PhonePrivacyCardProps) {
  const switchId = useId()
  return (
    <Card asChild>
      <section className="flex flex-col gap-3">
        <h2>Phone privacy</h2>
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <label htmlFor={switchId} className="font-bold">
              Hide my phone number from clubs
            </label>
            <p className="m-0 text-fg2 text-sm">
              Clubs can find you by your player ID or QR code instead. Your phone and email are
              never on your public profile or the leaderboard, whatever this is set to.
            </p>
          </div>
          <Switch
            id={switchId}
            aria-label="Hide my phone number from clubs"
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
              ? 'Saved: your phone number is hidden from clubs.'
              : 'Saved: clubs can see your phone number.'}
        </p>
        {error ? <Notice tone="error">{error}</Notice> : null}
        <p className="m-0 text-fg2 text-sm">
          Hiding your number applies from now on. It can't erase what a club has already seen, and a
          club device that's offline updates when it reconnects. It doesn't change how you sign in.
        </p>
      </section>
    </Card>
  )
}
