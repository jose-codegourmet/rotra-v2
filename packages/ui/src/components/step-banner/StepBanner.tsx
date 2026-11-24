import { cn } from '@rotra/ui/cn'

export type StepBannerProps = {
  /** Image URL (path string), e.g. /art/onboarding/shots-banner.webp; the app supplies it */
  src: string
  /** Describes the picture for screen readers */
  alt: string
  className?: string
}

/** The prototypes' .ob-banner: a wide picture above a step's answers. 12:5 on wide screens, 2:1 on phones. */
export function StepBanner({ src, alt, className }: StepBannerProps) {
  return (
    <div
      role="img"
      aria-label={alt}
      style={{ backgroundImage: `url('${src}')` }}
      className={cn(
        'aspect-[2/1] w-full rounded-lg border border-border bg-elev bg-cover bg-center bg-no-repeat min-[641px]:aspect-[12/5]',
        className,
      )}
    />
  )
}
