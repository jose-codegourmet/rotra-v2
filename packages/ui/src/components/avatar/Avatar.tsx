import { cn } from '@rotra/ui/cn'
import { type AvatarVariants, avatarVariants } from './Avatar.variants'

export type AvatarProps = AvatarVariants & {
  /** Full name: gives the initials fallback and the picture's description */
  name: string
  /** Picture URL; initials show when missing */
  src?: string
  /**
   * Opens the player's profile. Player pictures are clickable on operator screens; the avatar then
   * renders as a button named "View <name>'s profile".
   */
  onClick?: () => void
  className?: string
}

/** First letters of the first two words, as the prototypes draw them ("Miguel Santos" → "MS"). */
function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('')
}

/** The prototypes' .avatar: a player's picture, or their initials on a neutral circle. */
export function Avatar({ name, src, size, shape, tone, onClick, className }: AvatarProps) {
  const classes = cn(avatarVariants({ size, shape, tone }), className)
  const face = src ? (
    <span className={classes}>
      <img src={src} alt={name} className="size-full object-cover" />
    </span>
  ) : (
    <span aria-hidden className={classes}>
      {initialsOf(name)}
    </span>
  )
  if (!onClick) return face
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`View ${name}'s profile`}
      title={name}
      className={cn(
        'group/avatar m-0 flex-none rounded-full border-0 bg-transparent p-0 leading-none',
        '[&>span]:hover:shadow-[0_0_0_2px_var(--accent)]',
        shape === 'square' && 'rounded-[14px]',
      )}
    >
      {face}
    </button>
  )
}
