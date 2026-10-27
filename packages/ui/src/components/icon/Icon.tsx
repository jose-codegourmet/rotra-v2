import type { ReactNode, SVGProps } from 'react'
import { ICONS, type IconName } from './Icon.paths'

export type { IconName }

export type IconProps = Omit<SVGProps<SVGSVGElement>, 'children'> & {
  name: IconName
  /** Overrides the prototype's default size for this icon */
  size?: number
}

/**
 * A prototype icon. Decorative by default (aria-hidden); the control around it carries the
 * accessible name. Pass `aria-label` and `role="img"` for a standalone meaningful icon.
 */
export function Icon({ name, size, ...props }: IconProps) {
  const def: { size: number; strokeWidth: number; filled?: boolean; body: ReactNode } = ICONS[name]
  const px = size ?? def.size
  return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: decorative unless the caller passes aria-label (then aria-hidden is dropped)
    <svg
      width={px}
      height={px}
      viewBox="0 0 24 24"
      fill={def.filled ? 'currentColor' : 'none'}
      stroke={def.filled ? undefined : 'currentColor'}
      strokeWidth={def.filled ? undefined : def.strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={props['aria-label'] ? undefined : true}
      focusable="false"
      {...props}
    >
      {def.body}
    </svg>
  )
}
