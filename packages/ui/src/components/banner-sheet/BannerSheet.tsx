'use client'

import { Button } from '@rotra/ui/button'
import { cn } from '@rotra/ui/cn'
import { DEFAULT_PROFILE_BANNER, PROFILE_BANNERS, ProfileBanner } from '@rotra/ui/profile-banner'
import { Sheet } from '@rotra/ui/sheet'
import { RadioGroup } from 'radix-ui'
import { useState } from 'react'

export type BannerOption = {
  /** The banner key the player's profile stores */
  key: string
  name: string
  /** An Admin-uploaded banner; seeded banners are drawn from tokens by key */
  imageUrl?: string | null
}

export type BannerSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The saved banner key; missing = Court */
  value?: string | null
  /** The banners shown to players (Admin › Profile banners); defaults to the six predefined ones */
  options?: BannerOption[]
  /** Done with a changed pick: the container saves it and toasts “Banner updated”; closes on success */
  onCommit: (key: string) => Promise<unknown>
  /** The save is in flight: Done shows Saving… and the sheet can't be dismissed */
  isPending?: boolean
  /** No banners to pick yet (loading) or offline: the tiles and Done are disabled */
  disabled?: boolean
}

const DEFAULT_OPTIONS: BannerOption[] = PROFILE_BANNERS.map((banner) => ({ ...banner }))

/** Mount a fresh draft each time; dismissal discards it. */
export function BannerSheet(props: BannerSheetProps) {
  return props.open ? <BannerDraft {...props} /> : null
}

/**
 * The Profile banner dialog (#765), the same behaviour as Profile picture: 5:2 tiles in a radio
 * group, the draft outlined; Done saves, Cancel or dismissing discards. Players never upload.
 */
function BannerDraft({
  onOpenChange,
  value,
  options = DEFAULT_OPTIONS,
  onCommit,
  isPending = false,
  disabled = false,
}: BannerSheetProps) {
  const saved = value ?? DEFAULT_PROFILE_BANNER
  const [draft, setDraft] = useState(saved)
  const [committing, setCommitting] = useState(false)
  const [error, setError] = useState('')
  const pending = isPending || committing
  const done = async () => {
    if (pending || draft === saved) return
    setCommitting(true)
    setError('')
    try {
      await onCommit(draft)
      onOpenChange(false)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't save your banner. Try again.")
      setCommitting(false)
    }
  }
  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!pending) onOpenChange(open)
      }}
      hideClose={pending}
      dismissible={!pending}
      title="Profile banner"
      footer={
        <>
          <Button disabled={pending} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={pending || disabled || draft === saved}
            onClick={() => void done()}
          >
            {pending ? 'Saving…' : 'Done'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3.5" aria-busy={pending}>
        <RadioGroup.Root
          aria-label="Profile banner"
          value={draft}
          onValueChange={(next) => {
            if (next) setDraft(next)
          }}
          disabled={pending || disabled}
          className="grid grid-cols-2 gap-2 sm:grid-cols-3"
        >
          {options.map((option) => (
            <RadioGroup.Item
              key={option.key}
              value={option.key}
              aria-label={option.name}
              title={option.name}
              className={cn(
                'aspect-[5/2] w-full cursor-pointer overflow-hidden rounded-md border-2 border-border p-0',
                'data-[state=checked]:border-accent data-[state=checked]:shadow-[0_0_0_2px_var(--accent-subtle)]',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
                'disabled:cursor-not-allowed disabled:opacity-45',
              )}
            >
              <ProfileBanner
                bannerKey={option.key}
                imageUrl={option.imageUrl}
                className="size-full"
              />
            </RadioGroup.Item>
          ))}
        </RadioGroup.Root>
        {error ? (
          <p role="alert" className="text-sm text-error">
            {error}
          </p>
        ) : null}
        <p className="text-xs text-fg2">
          Public. Pick one of ROTRA's banners; your own images can't be uploaded.
        </p>
      </div>
    </Sheet>
  )
}
