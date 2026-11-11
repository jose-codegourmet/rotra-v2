'use client'

import { Card } from '@rotra/ui/card'
import { Notice } from '@rotra/ui/notice'
import { RadioChoiceList } from '@rotra/ui/radio-choice-list'

/** Product terms §12: players.profile_visibility; new registrations default to private. */
export type ProfileVisibility = 'public' | 'private' | 'always_private'

/** The three choices with their helper lines, as P-PROFILE-PRIVACY words them. */
export const PROFILE_VISIBILITY_CHOICES: {
  value: ProfileVisibility
  title: string
  description: string
}[] = [
  {
    value: 'public',
    title: 'Public',
    description: 'Visitors and signed-in ROTRA players see your profile.',
  },
  {
    value: 'private',
    title: 'Private',
    description: 'Visitors see your name masked. Signed-in ROTRA players see your profile.',
  },
  {
    value: 'always_private',
    title: 'Always private',
    description:
      'Everyone sees your name masked; your picture and banner stay visible. Only the Queue Master of a session you join sees your name.',
  },
]

/** “public”, “private”, “always private”: the words in the saved line, toasts and offline error. */
export function profileVisibilityWord(visibility: ProfileVisibility) {
  return visibility === 'always_private' ? 'always private' : visibility
}

export type ProfileVisibilityControlProps = {
  /** The confirmed, saved level; the choices never show an unconfirmed one */
  savedVisibility: ProfileVisibility
  /** Saving…: every choice is disabled */
  isPending?: boolean
  /** e.g. the offline error “Couldn't save because you're offline. Your profile is still private.” */
  error?: string
  /** A different level was chosen; the container saves it and shows the toast */
  onChange: (next: ProfileVisibility) => void
}

/**
 * P-PROFILE-PRIVACY › Profile visibility: Public · Private · Always private as a radio group with
 * helper lines, then the saved-state line (“Saving…” or “Saved: your profile is …”) and any error.
 */
export function ProfileVisibilityControl({
  savedVisibility,
  isPending,
  error,
  onChange,
}: ProfileVisibilityControlProps) {
  return (
    <Card asChild>
      <section className="flex flex-col gap-3">
        <h2>Profile visibility</h2>
        <RadioChoiceList
          aria-label="Profile visibility"
          choices={PROFILE_VISIBILITY_CHOICES}
          value={savedVisibility}
          onChange={(next) => onChange(next as ProfileVisibility)}
          disabled={isPending}
          aria-busy={isPending}
        />
        <p className="m-0 text-sm" aria-live="polite">
          {isPending
            ? 'Saving…'
            : `Saved: your profile is ${profileVisibilityWord(savedVisibility)}.`}
        </p>
        {error ? <Notice tone="error">{error}</Notice> : null}
      </section>
    </Card>
  )
}
