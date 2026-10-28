import { AwardsSlide, type AwardsSlideProps } from '@rotra/ui/awards-slide'
import { Card } from '@rotra/ui/card'
import { cn } from '@rotra/ui/cn'
import { OffDaySlide, type OffDaySlideProps } from '@rotra/ui/off-day-slide'
import { StandingsSlide, type StandingsSlideProps } from '@rotra/ui/standings-slide'

/**
 * What the publication put on the page: only the slides present are rendered. Off Day has no
 * `variant` on purpose; this section always draws it with the public variant (no private band).
 */
export type PublicResultsSectionPublished = {
  standings?: StandingsSlideProps
  awards?: AwardsSlideProps
  offDay?: Omit<OffDaySlideProps, 'variant'>
}

export type PublicResultsSectionProps = {
  /** null before publication: the page then says results have not been shared */
  published: PublicResultsSectionPublished | null
  className?: string
}

/**
 * The public session page's Results section (Q-PUBLIC-RESULTS): the heading "Results" and the
 * published Standings and/or Awards slides, plus Off Day only when it was explicitly included, drawn
 * without its private band. Before publication it is one card: "Results for this session have not
 * been shared." It never claims there were no games, and it has no way to render private data: the
 * caller only passes what the publication contains.
 */
export function PublicResultsSection({ published, className }: PublicResultsSectionProps) {
  if (!published) {
    return (
      <Card asChild className={cn('px-3 py-6 text-center text-sm text-fg2', className)}>
        <section aria-label="Results">Results for this session have not been shared.</section>
      </Card>
    )
  }
  const { standings, awards, offDay } = published
  return (
    <section
      aria-labelledby="public-results-heading"
      className={cn('flex flex-col gap-3', className)}
    >
      <h2 id="public-results-heading">Results</h2>
      {standings ? <StandingsSlide {...standings} /> : null}
      {awards ? <AwardsSlide {...awards} /> : null}
      {offDay ? <OffDaySlide {...offDay} variant="public" /> : null}
    </section>
  )
}
