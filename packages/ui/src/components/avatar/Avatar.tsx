'use client'

import { cn } from '@rotra/ui/cn'
import { Icon } from '@rotra/ui/icon'
import { useRef, useState } from 'react'
import { type AvatarVariants, avatarVariants } from './Avatar.variants'

export type AvatarProps = AvatarVariants & {
  /** Full name: gives the initials fallback and the picture's description */
  name: string
  /** Use these initials instead of deriving them from name (clubs store their own, e.g. "LS") */
  initials?: string
  /** Picture URL; initials show when missing or the image cannot load */
  src?: string
  /**
   * Opens the player's profile. Player pictures are clickable on operator screens; the avatar then
   * renders as a button named "View <name>'s profile".
   */
  onClick?: () => void
  /**
   * Opens the full photo (PhotoViewer, D-PHOTO-VIEWER). Only a real picture that has loaded renders
   * as a button named "View full photo of <name>" (zoom-in cursor, focus ring); initials stay inert.
   * Ignored when onClick is set: an avatar that opens a profile keeps opening the profile.
   * Leave it out when the avatar sits inside another button or link.
   */
  onView?: () => void
  /** Accessible name of the view button; defaults to "View full photo of <name>" */
  viewLabel?: string
  /**
   * With onView: on hover and keyboard focus the picture dims (`--bg` at 55%) under a 26 px eye
   * (the profile cards' picture, 2026-11-13-profile-card-name-layout sixth pass).
   */
  viewEye?: boolean
  className?: string
}

/** First letters of the first two words, as the prototypes draw them ("Mikee Abellana" → "MA"). */
function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('')
}

/** Keyed by source and identity so a changed picture cannot retain a failure or frozen frame. */
function AvatarFace({
  name,
  initials,
  src,
  size,
  shape,
  tone,
  className,
  onView,
  viewLabel,
  viewEye,
}: Omit<AvatarProps, 'onClick'>) {
  const frozen = useRef<HTMLCanvasElement>(null)
  const [failed, setFailed] = useState(false)
  const classes = cn(avatarVariants({ size, shape, tone }), className)
  if (!src || failed) {
    return (
      <span aria-hidden className={classes}>
        {initials ?? initialsOf(name)}
      </span>
    )
  }
  const picture = (
    <span className={cn(classes, 'relative')}>
      <img
        src={src}
        alt={name}
        className="size-full object-cover motion-reduce:invisible"
        onError={() => setFailed(true)}
        onLoad={(event) => {
          const canvas = frozen.current
          if (!canvas) return
          const image = event.currentTarget
          const side = Math.min(image.naturalWidth, image.naturalHeight)
          canvas.width = 176
          canvas.height = 176
          canvas
            .getContext('2d')
            ?.drawImage(
              image,
              (image.naturalWidth - side) / 2,
              (image.naturalHeight - side) / 2,
              side,
              side,
              0,
              0,
              176,
              176,
            )
        }}
      />
      <canvas
        ref={frozen}
        role="img"
        aria-label={name}
        className="absolute inset-0 hidden size-full object-cover motion-reduce:block"
      />
    </span>
  )
  if (!onView) return picture
  return (
    <button
      type="button"
      onClick={onView}
      aria-label={viewLabel ?? `View full photo of ${name}`}
      className={cn(
        'm-0 inline-flex flex-none cursor-zoom-in border-0 bg-transparent p-0 leading-none',
        'focus-visible:outline-none focus-visible:[&>span]:outline-2 focus-visible:[&>span]:outline-offset-2 focus-visible:[&>span]:outline-accent',
        shape === 'square' ? 'rounded-[14px]' : 'rounded-full',
        viewEye && 'group/eye relative',
      )}
    >
      {picture}
      {viewEye ? (
        <span
          aria-hidden
          className={cn(
            'pointer-events-none absolute inset-0 grid place-items-center bg-[color-mix(in_srgb,var(--bg)_55%,transparent)] text-fg opacity-0',
            'transition-opacity duration-150 group-hover/eye:opacity-100 group-focus-visible/eye:opacity-100 motion-reduce:transition-none',
            shape === 'square' ? 'rounded-[14px]' : 'rounded-full',
          )}
        >
          <Icon name="eye" size={26} />
        </span>
      ) : null}
    </button>
  )
}

/**
 * The prototypes' .avatar: a player's picture, or their initials on a neutral circle. onClick opens
 * the profile; onView opens the full photo (pictures only); with neither it is just a picture.
 */
export function Avatar({ onClick, onView, ...props }: AvatarProps) {
  if (!onClick) {
    return <AvatarFace key={JSON.stringify([props.src, props.name])} {...props} onView={onView} />
  }
  const face = <AvatarFace key={JSON.stringify([props.src, props.name])} {...props} />
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`View ${props.name}'s profile`}
      title={props.name}
      className={cn(
        'group/avatar m-0 flex-none rounded-full border-0 bg-transparent p-0 leading-none',
        '[&>span]:hover:shadow-[0_0_0_2px_var(--accent)]',
        props.shape === 'square' && 'rounded-[14px]',
      )}
    >
      {face}
    </button>
  )
}
