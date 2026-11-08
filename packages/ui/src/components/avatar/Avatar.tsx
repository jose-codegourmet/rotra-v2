'use client'

import { cn } from '@rotra/ui/cn'
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
}: Omit<AvatarProps, 'onClick'>) {
  const frozen = useRef<HTMLCanvasElement>(null)
  const [failed, setFailed] = useState(false)
  const classes = cn(avatarVariants({ size, shape, tone }), className)
  return src && !failed ? (
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
  ) : (
    <span aria-hidden className={classes}>
      {initials ?? initialsOf(name)}
    </span>
  )
}

/** The prototypes' .avatar: a player's picture, or their initials on a neutral circle. */
export function Avatar({ onClick, ...props }: AvatarProps) {
  const face = <AvatarFace key={JSON.stringify([props.src, props.name])} {...props} />
  if (!onClick) return face
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
