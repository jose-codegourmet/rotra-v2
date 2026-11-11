'use client'

import { cn } from '@rotra/ui/cn'
import {
  DEFAULT_PROFILE_BANNER,
  PROFILE_BANNERS,
  ProfileBanner,
  profileBannerName,
} from '@rotra/ui/profile-banner'
import { RadioGroup } from 'radix-ui'

export type BannerOption = {
  /** The banner key the player's profile stores */
  key: string
  name: string
  /** An Admin-uploaded banner; seeded banners are drawn from tokens by key */
  imageUrl?: string | null
}

export type BannerPickerProps = {
  /** The saved banner key; missing = Court */
  value?: string | null
  /** Applies at once; the container saves it and shows the Banner updated toast */
  onChange: (key: string) => void
  /** The banners shown to players (Admin › Profile banners); defaults to the six predefined ones */
  options?: BannerOption[]
  /** Saving or offline */
  disabled?: boolean
  className?: string
}

const DEFAULT_OPTIONS: BannerOption[] = PROFILE_BANNERS.map((banner) => ({ ...banner }))

/**
 * Edit profile › Name › Banner: the predefined Profile banners as swatches in a radio group, the
 * current one outlined, then “Selected: NAME · Public. …”. Players never upload a banner.
 */
export function BannerPicker({
  value,
  onChange,
  options = DEFAULT_OPTIONS,
  disabled,
  className,
}: BannerPickerProps) {
  const current = value ?? DEFAULT_PROFILE_BANNER
  const selectedName =
    options.find((option) => option.key === current)?.name ?? profileBannerName(current)
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <span className="text-xs font-semibold tracking-[0.5px] text-fg2 uppercase">Banner</span>
      <RadioGroup.Root
        aria-label="Profile banner"
        value={current}
        onValueChange={(next) => {
          if (next && next !== current) onChange(next)
        }}
        disabled={disabled}
        orientation="horizontal"
        className="flex flex-wrap gap-2"
      >
        {options.map((option) => (
          <RadioGroup.Item
            key={option.key}
            value={option.key}
            aria-label={option.name}
            title={option.name}
            className={cn(
              'h-9 w-[84px] cursor-pointer overflow-hidden rounded-md border-2 border-border p-0',
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
      <span className="text-xs text-fg2" aria-live="polite">
        Selected: {selectedName} · Public. Pick one of ROTRA's banners; your own images can't be
        uploaded.
      </span>
    </div>
  )
}
